import { Consumer } from 'sqs-consumer';
import { SQSClient } from '@aws-sdk/client-sqs';
 
 
const app = Consumer.create({
  queueUrl: 'https://sqs.us-east-1.amazonaws.com/111811281854/Aws-queue-Peru-CPE',
  handleMessage: async (message) => {
    console.log(message);
  },
  sqs: new SQSClient({
    region: 'us-east-1',
  })
});
app.on('error', (err) => {
  console.error(err.message);
});

app.on('processing_error', (err) => {
  console.error(err.message);
});

app.start();