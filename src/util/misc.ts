import { useState } from 'react';


function simpleHash(inputString: string) {
  //const length = 63
  const length = 32
  let hash = 0;
  for (let i = 0; i < inputString.length; i++) {
    const charCode = inputString.charCodeAt(i);
    hash += charCode;
  }

  // Repeat the hash value to achieve the desired length
  let result = '';
  while (result.length < length) {
    result += hash.toString();
  }

  return result.substring(0, length);
}


// let arrays have a random sample method
const random = function (A) {
  return A[Math.floor((Math.random()*A.length))];
}


function generateRandomHash(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}


function arraysAreEqual(arr1, arr2) {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}


export { simpleHash, random, generateRandomHash, arraysAreEqual };