import { sendToBackground } from '@plasmohq/messaging';
import React, {useState, useEffect} from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { consistentColor } from '~util/DOM';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);



const MergedBarPlot = ({ resultsData }) => {
  const data = {
    labels: ['Accuracy', 'Precision', 'Recall', 'TP', 'TN', 'FP', 'FN'],
    datasets: resultsData.map(result => ({
      label: result.model.name,
      data: [result.accuracy, result.precision, result.recall, result.tp, result.tn, result.fp, result.fn],
      backgroundColor: consistentColor(result.model.name),
    })),
  };

  const options = {
    scales: {
      x: {},
      y: {}
    },
    maintainsAspectRatio: true,
    aspectRatio: 2
  };

  return <Bar data={data} options={options} />;
};



const ExperimentRow = ({ experiment, resultsData, color }) => {

  return (
    <>
      <tr style={{backgroundColor: color}}>
        <td style={{verticalAlign:"top"}}><b>{experiment.experiment_name}</b></td>
        <td colSpan="10">
          <div style={{height: "150px"}}>
            <MergedBarPlot resultsData={resultsData} />
          </div>
        </td>
      </tr>
    </>
  );
};



function TestingPage() {
  const [testData, setTestData] = useState([]);
  const [progress, setProgress] = useState("No experiment running.");
  const [resultData, setResultData] = useState({});

  useEffect(() => {
    const intervalId = setInterval(async () => {
      console.log("check")
      if (await sendToBackground({ name: "testsethelper", body: { cmd: "check" } })) {
        clearInterval(intervalId);
        setTestData(await sendToBackground({ name: "testsethelper", body: { cmd: "gettestset" } }))
        setResultData(await sendToBackground({ name: "testsethelper", body: { cmd: "getresults" } }))
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [])


  //const resultData = Object.fromEntries(testData.map(t => [t.experiment_name, models.map(m => mock_metrics(t,m))]));
  console.log("results",resultData)

  function getCurrentModel() {
    return {
      name: "",
      model: "",
      chat: "",
      temperature: "",
      prompt: "",
    }
  }

  function mock_metrics(experiment, model) {
    const accuracy = 0.5;
    const precision = 0.5;
    const recall = 0.5;
    const tp = 0.5;
    const tn = 0.5;
    const fp = 0.5;
    const fn = 0.5;
    return { accuracy, precision, recall, tp, tn, fp, fn, model };
  };


  async function evaluate() {
    const model = getCurrentModel();
    const results = testData.map(experiment => mock_metrics(experiment, model))

    // send results to server
    setResultData(await sendToBackground({ name: "testsethelper", body: { cmd: "saveresults" } }))

    // update state with newest results
    setResultData(await sendToBackground({ name: "testsethelper", body: { cmd: "getresults" } }))
  }


  //const { accuracy, precision, recall, tp, tn, fp, fn } = calculateMetrics(setup);

  const table = (!testData || !Object.entries(resultData).length) ? "No experiments found." : (
    <table style={{marginTop: "3em"}}>
      <thead>
        <tr>
          <th>Model</th>
          <th>Results</th>
        </tr>
      </thead>
      <tbody>
        {testData.map((experiment, index) => (
          <ExperimentRow key={index} experiment={experiment} resultsData={resultData[experiment.experiment_name]} color={index % 2 ? "#eee" : "white"} />
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <h2>Testing Page</h2>
      <div style={{marginBottom: "1em"}}>
        <h3>Controls</h3>
        <button onClick={() => evaluate()}>Test current model.</button>
        <div>Progress: {progress}</div>
      </div>
      <div style={{marginBottom: "1em"}}>
        <h3>Controls</h3>
        {table}
      </div>
    </div>
  );
}

export default TestingPage;