import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const Histogram = ({ scoresA, scoresB }) => {
  const numBins = 10;
  let binsA = new Array(numBins).fill(0);
  let binsB = new Array(numBins).fill(0);
  const binSize = 1 / numBins;

  if (!scoresA) return "";

  const calculateBin = (score) => Math.floor(score / binSize);

  scoresA.forEach(score => {
    if (score >= 0 && score <= 1) {
      binsA[calculateBin(score)]++;
    }
  });

  scoresB.forEach(score => {
    if (score >= 0 && score <= 1) {
      binsB[calculateBin(score)]++;
    }
  });

  const data = {
    labels: binsA.map((_, index) => `${(index * binSize).toFixed(2)} - ${((index + 1) * binSize).toFixed(2)}`),
    datasets: [
      {
        label: 'Scores A',
        data: binsA,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
      {
        label: 'Scores B',
        data: binsB,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'x',
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default Histogram;