import json
import logging
import boto3

s3_client = boto3.client('s3')
sqs = boto3.client('sqs')
sns = boto3.client('sns')

def lambda_handler(event, context):
    print(event)
    blockNumber = json.loads(event['Records'][0]['body'])['BlockNumber']
    # dexes_obj = s3_client.get_object(Bucket='xtreamly-pipeline-config', Key='dexes.json')
    # dexes = json.loads(dexes_obj['Body'].read().decode('utf-8'))
    tokens_obj = s3_client.get_object(Bucket='xtreamly-pipeline-config', Key='token_pairs.json')
    tokens = json.loads(tokens_obj['Body'].read().decode('utf-8'))
    
    # Currently we're only sending to uniswap fifo
    for token in tokens['pairs']:
        message = {"blockNumber": blockNumber, "tokenPair": token}
        print(message)
        
        formattedMessage = json.dumps({'default': json.dumps(message)})
        print(formattedMessage)
        response = sns.publish(
            TopicArn='arn:aws:sns:eu-west-2:893048150390:NewBlockTokenPairs.fifo',
            Message=formattedMessage,
            MessageStructure='json',
            MessageGroupId="1",
            )
        print(response)

    return {
        'statusCode': 200,
        'body': json.dumps(tokens)
    }
