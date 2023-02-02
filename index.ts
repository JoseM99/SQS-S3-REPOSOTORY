import express from 'express';
import { S3Client} from '@aws-sdk/client-s3' 
import { AWS_BUCKET_REGION, AWS_PUBLIC_KEY, AWS_SECRET_KEY} from './config' 
import cors from 'cors'  
 

//Variables required to aws
var AWS = require('aws-sdk');
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
 
//Getting Express
const app = express()

//Server Port
const PORT = 7000;

//middlewares
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

//Parameters located in System Manager
const ssmClient = new AWS.SSM({
    apiVersion: '2014-11-06',
    region: 'us-east-1'
  });
  
  //Getting Parameters
  ssmClient.getParameter({
    AWS_BUCKET_NAME: '/S3/bucket_name',
    AWS_BUCKET_REGION: '/S3/bucket_region',
    AWS_PUBLIC_KEY: '/S3/Global/Public_Key',
    AWS_SECRET_KEY: '/S3/Global/Secret_Key',

    WithDecryption: true,
  }, (err:any, data:any) => {
    if (data?.Parameter) {
      console.log(data.Parameter)
    }
  });
 
  //Request post method
  app.post('/send', (req, res) => { 
    try{
        const file = req.body.file
        const nameFile = req.body.nameFile
        const typeFile = req.body.typeFile
        const mimeTypeFile = req.body.mimeTypeFile 

        //Validation S3 object
        if (file === "") return res.status(409).json("file param is required");
        if (nameFile === "") return res.status(409).json("Name file is required");
        if (typeFile === "") return res.status(409).json("Type file is required");
        if (mimeTypeFile === "") return res.status(409).json("mimeTypeFile file is required");
      
        //Validation S3 object
        if (file.trim().length === 0) return res.status(409).json({message: "file param is required"});
        if (nameFile.trim().length === 0) return res.status(409).json({message: "Name file is required"});
        if (typeFile.trim().length === 0) return res.status(409).json({message: "Type file is required"});
        if (mimeTypeFile.trim().length === 0) return res.status(409).json({message: "mimeTypeFile file is required"});
        
        //Sending object to S3
        const returnvalue =  uploadFile(file,nameFile,typeFile,mimeTypeFile);
        res.json({message: 'data successfully registered'})

    }catch (error) {
        res.json({message: error})
    }    
});

//listening
app.listen(PORT, () => {
    console.log(`Express server is listening at port ${PORT}`);
});

const S3 = new S3Client({
  region: "us-east-1", 
  credentials: {
    accessKeyId: ((AWS_PUBLIC_KEY as unknown) as string),
    secretAccessKey: ((AWS_SECRET_KEY as unknown) as string),
  },
});


async function uploadFile(base64:string ,nameFile:string ,typeFile:string ,mimeTypeFile:string) {
    
    const AWS = require('aws-sdk'); 
    AWS.config.setPromisesDependency(require('bluebird'));
    AWS.config.update({ accessKeyId: AWS_PUBLIC_KEY, secretAccessKey: AWS_SECRET_KEY, region: AWS_BUCKET_REGION });
 
    const s3 = new AWS.S3();
    
    const base64Data =  Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64'); 
    const type = typeFile ;

    console.log("type : ", type);

    const userId = nameFile
 
    const uploadParams = {
        Bucket: 'bucket-nodejs-testing/CPE_IN_PROCESS/CPE_STR_XML_STEP_1',
        Key: `${userId}.${type}`, 
        Body: base64Data,
        ACL: 'public-read',
        ContentEncoding: 'base64',
        ContentType: `${mimeTypeFile}/${type}`
    }  

    console.log(uploadParams)

    try {
        const { Location, Key } = await s3.upload(uploadParams).promise(); 
      //   var params = {
      //     QueueUrl: queueUrl,
      //     VisibilityTimeout: 600,
      //     MessageAttributeNames: ["All"],
      // };
        //INIT-SENDING SQS
        var params = {
          // Remove DelaySeconds parameter and value for FIFO queues
          DelaySeconds: 0,
          MessageAttributes: { 
            "step1_str_xml": {
              DataType: "String",
              StringValue: nameFile,
            }
          },
          // MessageDeduplicationId: 'false',
          MessageBody: nameFile,
          // MessageGroupId: 'test',
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/111811281854/Aws-queue-Peru-CPE"
        };
        
        sqs.sendMessage(params, function(err:any , data:any) {
          if (err) {
            console.log("Error", err);
          } else {
            console.log("Success", data.MessageId);
          }
        });
        
        //END-SENDING SQS

      } catch (error) {
         console.log(error)
      }
    
}