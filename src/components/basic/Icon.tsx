import React from 'react';
import BoxiconsCSS from 'data-text:boxicons/css/boxicons.min.css';
import BoxiconsFont from 'data-base64:boxicons/fonts/boxicons.woff2';

export const styleCSS = `
${BoxiconsCSS}

@font-face {
  font-family: boxicons;
  font-weight: 400;
  font-style: normal;
  src: url(${BoxiconsFont});
}
`;

const Icon = ({name}) => {
  return (
    <i className={`bx bx-${name}`}></i>
  );
};

export default Icon;