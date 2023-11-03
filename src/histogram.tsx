import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// Register the required components from Chart.js
Chart.register(...registerables, annotationPlugin);

const Histogram = ({ scores, lines }) => {
  // Determine min and max of scores
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // Define the number of bins for the histogram
  const numBins = 100;
  // Calculate the range of each bin
  const range = maxScore - minScore;
  const binSize = range / numBins;

  // Create the bins with an initial count of 0
  let bins = new Array(numBins).fill(0);

  // Function to calculate the appropriate bin for each score
  const calculateBin = (score) => {
    return Math.min(
      Math.floor((score - minScore) / binSize), // Bin index
      numBins - 1 // Make sure the max score fits in the last bin
    );
  };

  // Place each score into a bin
  scores.forEach(score => {
    bins[calculateBin(score)]++;
  });

  // Data for react-chartjs-2
  const data = {
    labels: bins.map((_, index) => `${(minScore + index * binSize).toFixed(2)} - ${(minScore + (index + 1) * binSize).toFixed(2)}`),
    datasets: [
      {
        label: 'Scores',
        data: bins,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Create annotations for vertical lines
  /*
  const annotations = lines.map((line) => ({
    type: 'line',
    xMin: line,
    xMax: line,
    borderColor: 'red',
    borderWidth: 2,
    label: {
      content: `x: ${line}`,
      enabled: true,
      position: "start"
    }
  }));
  */
 const annotations = [];


  // Options for react-chartjs-2
  const options = {
    indexAxis: 'x',
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Score Range'
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      annotation: {
        annotations: annotations,
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default Histogram;
