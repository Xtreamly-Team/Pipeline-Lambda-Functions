import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sqsClient = new SQSClient();
const snsClient = new SNSClient();

export async function sendSQSMessage(messageSerialized, queueUrl, messageAttributes = undefined) {
  const params = {
    MessageAttributes: messageAttributes,
    MessageBody: messageSerialized,
    QueueUrl: queueUrl,
    MessageGroupId: "ExecutedSwaps",
  };
  try {
    const data = await sqsClient.send(new SendMessageCommand(params));
  }
  catch (e) {
    console.error(e)
  }
}

export const handler = async (event) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));

  for (const record of event['Records']) {
    const inputMessage = record.Sns.Message
    const swaps = JSON.parse(inputMessage)
    console.log(swaps)

    const dbWrapped = swaps.map((swap) => {
      return {
        Collection: "ExecutedSwaps",
        jsonDocument: JSON.stringify(swap)
      }
    })

    console.log(dbWrapped)

    await sendSQSMessage(JSON.stringify(dbWrapped), 'https://sqs.eu-west-2.amazonaws.com/893048150390/write_to_db.fifo')
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };

  return response;
};