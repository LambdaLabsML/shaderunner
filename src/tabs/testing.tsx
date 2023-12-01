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


const mock_metrics = (experiment, model) => {
  const accuracy = 0.5;
  const precision = 0.5;
  const recall = 0.5;
  const tp = 0.5;
  const tn = 0.5;
  const fp = 0.5;
  const fn = 0.5;
  return { accuracy, precision, recall, tp, tn, fp, fn, model };
};


const MergedBarPlot = ({ resultsData }) => {
  console.log(resultsData);
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
  console.log(experiment, resultsData)

  return (
    <>
      <tr style={{backgroundColor: color}}>
        <td style={{"vertical-align":"top"}}><b>{experiment.experiment_name}</b></td>
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

  const models = [
    { name: "_gpt3.5", model: "gpt", chat: true, temperature: 0, prompt: "myprompt" },
    { name: "gpt3.6", model: "gpt", chat: true, temperature: 0, prompt: "myprompt" },
    { name: "__gpt3.7", model: "gpt", chat: true, temperature: 0, prompt: "myprompt" }
  ]

  const resultData = Object.fromEntries(testData.map(t => [t.experiment_name, models.map(m => mock_metrics(t,m))]));
  console.log("results",resultData)

  //const { accuracy, precision, recall, tp, tn, fp, fn } = calculateMetrics(setup);

  if (!testData) return "";

  return (
    <div>
      <h2>Testing Page</h2>
      <button>Test current model.</button>
      <span>Progress: {progress}</span>

      <table style={{marginTop: "3em"}}>
        <thead>
          <tr>
            <th>Model</th>
            <th>Results</th>
          </tr>
        </thead>
        <tbody>
          {testData.map((experiment, index) => (
            <ExperimentRow key={index} experiment={experiment} resultsData={resultData[experiment.experiment_name]} color={index % 2 ? "#eee" : "white"}/>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TestingPage;