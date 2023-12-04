import React from 'react';
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
import { compute_metrics } from './metrics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);


const MergedBarPlot = ({ experiment, resultsData }) => {
  const ground_truth = experiment.labeled_splits.map(([c, split]) => c)
  const data = {
    labels: ['Bal. Acc', 'Precision', 'Recall', 'Specificity', 'F1Score', 'MCC', 'TP', 'TN', 'FP', 'FN'],
    datasets: resultsData.map(result => ({
      label: result.model.name,
      data: compute_metrics(ground_truth, result.results[experiment.name].classification),
      backgroundColor: consistentColor(result.model.name),
    })),
  };

  const options = {
    scales: {
      x: {},
      y: {}
    },
    maintainsAspectRatio: true,
    aspectRatio: 4,
    plugins: {
      legend: {
        position: 'right', // Positioning the legend on the right
      },
    },
  };

  return <Bar data={data} options={options} />;
};
  


const ExperimentRow = ({ experiment, resultsData, color }) => {

  return (
    <>
      <tr style={{ backgroundColor: color }}>
        <td style={{ verticalAlign: "top", width: "250px", padding: "1em" }}><b>{experiment.name}</b><br/><div>{experiment.query}</div></td>
        <td colSpan={10}>
          <div style={{ width: "1000px", padding:"1em" }}>
            <MergedBarPlot resultsData={resultsData} experiment={experiment} />
          </div>
        </td>
      </tr>
    </>
  );
};



function ResultsTable({ experimentData, resultsData }) {
  return <table style={{ marginTop: "3em" }}>
    <thead>
      <tr>
        <th>Experiment</th>
        <th>Results</th>
      </tr>
    </thead>
    <tbody>
      {experimentData.map((experiment, index) => (
        <ExperimentRow key={index} experiment={experiment} resultsData={resultsData} color={index % 2 ? "#eee" : "white"} />
      ))}
    </tbody>
  </table>
};
  
  export default ResultsTable;