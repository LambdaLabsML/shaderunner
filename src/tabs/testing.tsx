import { sendToBackground } from '@plasmohq/messaging';
import React, {useState, useEffect} from 'react';
import { eval_prompt, getCurrentModel } from '~llm_classify_prompt';
import ResultsTable from './testing/visualization';
import CollapsibleBox from '~components/basic/CollapsibleBox';
import { VectorStore_fromClass2Embedding, computeEmbeddingsCached } from '~util/embedding';
import { llm2classes } from '~background/messages/llm_classify';



function formatElapsedTime(startTime, endTime) {
  let delta = endTime - startTime; // delta time in milliseconds

  const hours = Math.floor(delta / 3600000); // 1 hour = 3600000 milliseconds
  delta %= 3600000;

  const minutes = Math.floor(delta / 60000); // 1 minute = 60000 milliseconds
  delta %= 60000;

  const seconds = Math.floor(delta / 1000); // 1 second = 1000 milliseconds
  const milliseconds = delta % 1000;

  return `${hours} hours, ${minutes} minutes, ${seconds} seconds, ${milliseconds} milliseconds`;
}




function TestingPage() {
  const [testData, setTestData] = useState([]);
  const [progress, setProgress] = useState(<span>No experiment running.</span>);
  const [_resultsData, setResultsData] = useState([]);


  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (await sendToBackground({ name: "testsethelper", body: { cmd: "check" } })) {
        clearInterval(intervalId);
        setTestData(await sendToBackground({ name: "testsethelper", body: { cmd: "gettestset" } }))
        setResultsData(await sendToBackground({ name: "testsethelper", body: { cmd: "getresults" } }))
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [])


  async function evaluate_model(experiment, classifier) {
      const splits = experiment.splits;
      const splitEmbeddings = experiment.splitEmbeddings;
      const url = experiment.url;

      const classes_pos = classifier.classes_pos;
      const classes_neg = classifier.classes_neg;
      const classStore = classifier.classStore;

      // mark sentences based on similarity
      let classification = [];
      for (let i=0; i<splits.length; i++) {
        const split = splits[i];

        // using precomputed embeddings
        const embedding = splitEmbeddings[split];
        const closest = await classStore.similaritySearchVectorWithScore(embedding, classes_pos.length + classes_neg.length);

        const score_plus = classes_pos ? closest.filter((c) => classes_pos.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
        const score_minus = classes_neg ? closest.filter((c) => classes_neg.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0

        // apply color if is first class
        classification.push(score_plus > score_minus)
      }

      return {classification};
  }

  const callQueue = [];
  let lastRequestStartTime = 0;
  const minIntervalBetweenCalls = 300;

  async function enqueueCall(url, title, query, onStartup) {
    return new Promise((resolve, reject) => {
      callQueue.push({ url, title, query, resolve, reject, onStartup });
      processQueue();
    });
  }
  
  async function processQueue() {
    if (callQueue.length === 0) {
      return;
    }
  
    const now = Date.now();
    const timeElapsed = now - lastRequestStartTime;
  
    if (timeElapsed < minIntervalBetweenCalls) {
      setTimeout(processQueue, minIntervalBetweenCalls - timeElapsed);
      return;
    }
  
    const { url, title, query, resolve, reject, onStartup } = callQueue.shift();
    lastRequestStartTime = Date.now();
  
    if (onStartup)
      onStartup();
    llm2classes(url, title, query).then(resolve).catch(reject);
  
    // Schedule the next request in 3 seconds
    if (callQueue.length > 0) {
      setTimeout(processQueue, minIntervalBetweenCalls);
    }
  }

  async function getClassifier(url, title, query, onStartup: () => {}) {
    return enqueueCall(url, title, query, onStartup);
  }

  async function evaluate() {
    const startTime = new Date();
    const model = await getCurrentModel();
    const { SYSTEM, USER } = eval_prompt({ url: "$URL", title: "$TITLE", query: "$QUERY" });
    model.prompt = `${SYSTEM}\n${USER}`
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') + // Months are 0-indexed
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    model.name = `${timestamp}-${model.model}-${model.chat}-${model.temperature}`;

    // Function to process each experiment
    async function processExperiment(experiment) {
      const setStatus = (msg) => setExperimentStatus(experiment, msg);

      // Embed splits
      setStatus(`embedding splits.`);
      experiment.splits = experiment.labeled_splits.map(([label, split]) => split);
      experiment.splitEmbeddings = await computeEmbeddingsCached(experiment.url, experiment.splits);

      // Query classifier
      setStatus(`... waiting for place in queue`);
      const classifier = await getClassifier(experiment.url, experiment.title, experiment.query, () => setStatus(`retrieving classifier`));

      // Embed classifiers
      setStatus('embedding classifiers');
      console.log(experiment, classifier)
      const allclasses = [...classifier.classes_pos, ...classifier.classes_neg];
      const classEmbeddings = await computeEmbeddingsCached("", allclasses, null); // dont save
      classifier.classStore = VectorStore_fromClass2Embedding(classEmbeddings);

      // Classify
      setStatus('classifying');
      const result = await evaluate_model(experiment, classifier);

      setStatus('done');
      return [experiment.name, result];
    }

    // Function to update progress for all experiments
    function updateAllProgress(testData) {
      setProgress((
        <table>
          <thead>
            <tr>
              <th>Experiment</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {testData.map(experiment => (<tr key={experiment.name}><td><b>{experiment.name}</b></td><td>{experiment.status}</td></tr>))}
          </tbody>
        </table>
      ));
    }

    // Function to set individual experiment status and update progress
    function setExperimentStatus(experiment, status) {
      experiment.status = status;
      updateAllProgress(testData);
    }

    // Run all experiments concurrently
    const results = await Promise.all(testData.map(experiment => processExperiment(experiment)));

    // send results to server
    setProgress("saving results")
    await sendToBackground({ name: "testsethelper", body: { cmd: "saveresults", model: model, results: Object.fromEntries(results) } })

    // update state with newest results
    setResultsData(await sendToBackground({ name: "testsethelper", body: { cmd: "getresults" } }))

    // Final status update
    setProgress(`All experiments completed in ${formatElapsedTime(startTime, new Date())}.`);
  }

  if (!testData) return "";

  // sort results by model name / filename
  const resultsData = _resultsData.sort((r1,r2) => r1.model.name.localeCompare(r2.model.name))
  console.log(resultsData)

  // merged results & experiments
  const groups = ["all", ...new Set(testData.map(experiment => experiment.type))]
  const mergedTestData = groups.map(g => {
    const groupedTest = g == "all" ? testData : testData.filter(t => t.type == g)
    return {
      label: "merged",
      type: g,
      name: `${g}_merged`,
      query: `Merged all experiments of type '${g}'.`,
      merge_of: groupedTest.map(t => t.name),
      labeled_splits: [].concat(...groupedTest.map(t => t.labeled_splits))
    }
  });
  const mergedResultsData = resultsData.map(r => ({...r, results: Object.fromEntries(mergedTestData.map(t => {
    const merged_classification = [].concat(...t.merge_of.map(name => r.results[name].classification))
    return [t.name, {classification: merged_classification}];
  }))}))


  return (
    <div>
      <h2>Testing Page</h2>
      <button onClick={() => {evaluate()}}>Test current model.</button>
      <span>Progress: {progress}</span>

      <CollapsibleBox open={true} title={(<h3>Merged group results</h3>)}>
        <ResultsTable experimentData={mergedTestData} resultsData={mergedResultsData}/>
      </CollapsibleBox>

      {groups.filter(g => g!="all").map(g => (
        <CollapsibleBox key={g} open={false} title={(<h3>All from group: {g} ({testData.filter(experiment => experiment.type == g).length} experiments)</h3>)}>
          <ResultsTable experimentData={testData.filter(t => t.type == g)} resultsData={resultsData}/>
        </CollapsibleBox>
      ))}
    </div>
  );
}

export default TestingPage;