

const calculateMCC = (tp, tn, fp, fn) => {
    const numerator = tp * tn - fp * fn;
    const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
    return denominator === 0 ? 0 : numerator / denominator;
};


export const compute_metrics = (ground_truth: boolean[], classification: boolean[]) => {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    const n = ground_truth.length;

    for (let i = 0; i < ground_truth.length; i++) {
        if (ground_truth[i] && classification[i]) {
            tp++;
        } else if (!ground_truth[i] && !classification[i]) {
            tn++;
        } else if (!ground_truth[i] && classification[i]) {
            fp++;
        } else if (ground_truth[i] && !classification[i]) {
            fn++;
        }
    }

    //const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const specificity = tn + fp === 0 ? 0 : tn / (tn + fp);
    const f1Score = precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
    const balancedAccuracy = (recall + specificity) / 2;
    const mcc = calculateMCC(tp, tn, fp, fn);

    return [balancedAccuracy, precision, recall, specificity, f1Score, mcc, tp / n, tn / n, fp / n, fn / n];
};

