import { sendToBackground } from '@plasmohq/messaging';
import React, {useState, useEffect} from 'react';
import { eval_prompt, getCurrentModel } from '~llm_classify_prompt';
import ResultsTable from './testing/visualization';
import CollapsibleBox from '~components/basic/CollapsibleBox';
import { VectorStore_fromClass2Embedding, computeEmbeddingsCached } from '~util/embedding';
import { llm2classes } from '~background/messages/llm_classify';




function TestingPage() {
  const [testData, setTestData] = useState([]);
  const [progress, setProgress] = useState("No experiment running.");
  const [resultsData, setResultsData] = useState([]);


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
        const closest = await classStore.similaritySearchVectorWithScore(embedding, classes_pos.length, classes_neg.length);

        const score_plus = classes_pos ? closest.filter((c) => classes_pos.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0
        const score_minus = classes_neg ? closest.filter((c) => classes_neg.includes(c[0].pageContent)).reduce((a, c) => Math.max(a, c[1]), 0) : 0

        // apply color if is first class
        classification.push(score_plus > score_minus)
      }

      return {classification};
  }


  async function evaluate() {

    // init evaluation
    setProgress("initializing")
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

    // embed splits
    setProgress("embedding")
    for(let i=0; i<testData.length; i++) {
      const experiment = testData[i];
      setProgress(`embedding ${experiment.name} from url: ${experiment.url}`)
      experiment.splits = experiment.labeled_splits.map(([label, split]) => split)
      experiment.splitEmbeddings = await computeEmbeddingsCached(experiment.url as string, experiment.splits)
    }

    // get classifiers for each experiment
    setProgress("query classifier")
    const classifiers = [];
    for(let i=0; i<testData.length; i++) {
      const experiment = testData[i];
      setProgress(`retrieving classifier for ${experiment.name} with query ${experiment.query}.`)
      const classifier = await llm2classes(experiment.url, experiment.title, experiment.query)
      classifiers.push(classifier)
    }

    // embed classes
    setProgress("embed classifiers")
    for(let i=0; i<testData.length; i++) {
      const classifier = classifiers[i];
      const experiment = testData[i];
      const url = experiment.url;
      const allclasses = [...classifier.classes_pos, ...classifier.classes_neg]
      const classCollection = url + "|classes";
      const classEmbeddings = await computeEmbeddingsCached(classCollection, allclasses, "shaderunner-classes");
      const classStore = VectorStore_fromClass2Embedding(classEmbeddings)
      classifier.classStore = classStore;
    }

    // classify
    setProgress("classify")
    const results = [];
    for (let i = 0; i < testData.length; i++) {
      const experiment = testData[i];
      const result = await evaluate_model(experiment, classifiers[i]);
      results.push([experiment.name, result]);
    }

    // send results to server
    setProgress("saving results")
    await sendToBackground({ name: "testsethelper", body: { cmd: "saveresults", model: model, results: Object.fromEntries(results) } })

    // update state with newest results
    setResultsData(await sendToBackground({ name: "testsethelper", body: { cmd: "getresults" } }))
  }

  if (!testData) return "";

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