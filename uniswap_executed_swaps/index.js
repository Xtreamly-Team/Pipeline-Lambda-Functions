import { getAllSwaps } from "./swaps.js";

import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
const sqsClient = new SQSClient();
const snsClient = new SNSClient();

export async function sendSQSMessage(messageSerialized, queueUrl, messageAttributes = undefined) {
  const params = {
    MessageAttributes: messageAttributes,
    MessageBody: messageSerialized,
    QueueUrl: queueUrl,
    MessageGroupId: "1",
  };
  try {
    const data = await sqsClient.send(new SendMessageCommand(params));
  }
  catch (e) {
    console.error(e)
  }
}

export async function sendSNSMessage(messageSerialized, topicArn) {
  const params = {
    TopicArn: topicArn,
    Message: JSON.stringify({ 'default': messageSerialized }),
    MessageStructure: 'json',
  };
  try {
    const data = await snsClient.send(new PublishCommand(params));
    return data
  }
  catch (e) {
    console.error(e)
  }
}

export const handler = async (event) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    const request = JSON.parse(record.body)
    console.log(request)

    const blockNumber = request.blockNumber
    const token0 = request.tokenInAddress
    const token1 = request.tokenOutAddress

    const swaps = await getAllSwaps(blockNumber, blockNumber, token0, token1)

    console.log(swaps)

    if (swaps.length > 0) {
      await sendSNSMessage(JSON.stringify(swaps), 'arn:aws:sns:eu-west-2:893048150390:NewExecutedSwap')
    }

  }

  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };

  return response;
};
