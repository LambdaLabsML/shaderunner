import React from 'react';

const CircularProgressBar = ({ size, progress, className }) => {
    const radius = size;
    const strokeWidth = size;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress / 100 * circumference;

    return (
        <svg
            height={radius * 2}
            width={radius * 2}
            viewBox={`0 0 ${radius * 2} ${radius * 2}`}
            className={className}
        >
            <circle
                stroke="#eee"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <circle
                stroke="#777"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
        </svg>
    );
}

export default CircularProgressBar;