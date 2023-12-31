import type { PlasmoMessaging } from "@plasmohq/messaging"


const REST_API = "http://localhost:9901/"

async function isApiAccessible(url: string) {
  try {
      const response = await fetch(url);
      return response.ok;
  } catch (error) {
      return false;
  }
}


async function sendDataToServer(url, dataObject) {
  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(dataObject)
      });

      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Server response:', responseText);
      return responseText;
  } catch (error) {
      console.error('Error sending data to the server:', error);
      return "Saving failed.";
  }
}


async function fetchJsonData(url) {
  try {
      // Send a GET request to the server
      const response = await fetch(url);

      // Check if the response is OK (status code 200)
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the JSON data from the response
      const data = await response.json();

      // Use the JSON data as needed
      return data;
  } catch (error) {
      console.error('There was a problem fetching the test data:', error);
  }
}

 

type RequestBody = {
  cmd: string
  url: string,
  classifierData: any,
  splits: string[],
  classification: boolean[],
};



const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = req.body as RequestBody;
  console.log("testsethelper:", body)
  if (body.cmd == "check") {
    res.send(await isApiAccessible(REST_API+"hello"))
    return
  }

  const method = body.cmd.startsWith("save") ? sendDataToServer : fetchJsonData;
  res.send(await method(REST_API+body.cmd, body))
}

export default handler;