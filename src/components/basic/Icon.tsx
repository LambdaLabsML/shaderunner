import React from 'react';
import BoxiconsCSS from 'data-text:boxicons/css/boxicons.min.css';
import BoxiconsFont from 'data-base64:boxicons/fonts/boxicons.woff2';
import 'boxicons'

export const styleCSS = `
${BoxiconsCSS}

@font-face {
  font-family: boxicons;
  font-weight: 400;
  font-style: normal;
  src: url(${BoxiconsFont});
}
`;

const Icon = ({name, onClick=(ev) => {}}) => {
  return (
    <i className={`bx bxs-${name}`} onClick={onClick}></i>
  );
};

export default Icon;