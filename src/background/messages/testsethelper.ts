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


async function sendDataToServer(dataObject) {
  try {
      const response = await fetch(REST_API+"save", {
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
 

type RequestBody = {
  cmd: string
  url: string,
  classifierData: any,
  splits: string[],
  classification: boolean[],
};


const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = req.body as RequestBody;
  if (body.cmd == "check") {
    res.send(await isApiAccessible(REST_API+"hello"))
  }
  else if (body.cmd == "write") {
    res.send(await sendDataToServer(body))
  }
}

export default handler;