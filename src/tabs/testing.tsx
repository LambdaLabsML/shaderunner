import { sendToBackground } from '@plasmohq/messaging';
import React, {useState, useEffect} from 'react';
import { eval_prompt, getCurrentModel } from '~llm_classify_prompt';
import ResultsTable from './testing/visualization';
import CollapsibleBox from '~components/basic/CollapsibleBox';




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


  async function evaluate_model(experiment, model) {
      const url = experiment.url;
      const title = experiment.title;
      const splits = experiment.labeled_splits;
      const classification = new Array(splits.length).fill(false);
      return {classification};
  }


  async function evaluate() {
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
    const results = [];
    for(let i=0; i<testData.length; i++) {
      const experiment = testData[i];
      const result = await evaluate_model(experiment, model);
      results.push([experiment.name, result]);
    }

    // send results to server
    await sendToBackground({ name: "testsethelper", body: { cmd: "saveresults", model: model, results: Object.fromEntries(results) } })

    // update state with newest results
    setResultsData(await sendToBackground({ name: "testsethelper", body: { cmd: "getresults" } }))
  }


  //const { accuracy, precision, recall, tp, tn, fp, fn } = calculateMetrics(setup);

  console.log("result", resultsData)


  if (!testData) return "";

  const groups = ["all", ...new Set(testData.map(experiment => experiment.type))]


  // merged results & experiments
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