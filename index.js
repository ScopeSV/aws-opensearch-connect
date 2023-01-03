const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { Client, Connection } = require("@opensearch-project/opensearch");
const {
    OpenSearchClient,
    DescribeDomainCommand,
} = require("@aws-sdk/client-opensearch");
const aws4 = require("aws4");

const DOMAIN_NAME = "my-domain";
const INDEX = "my-index";
const REGION = "eu-west-1";

const createAwsConnector = (credentials) => {
    class AmazonConnection extends Connection {
        buildRequestObject(params) {
            const request = super.buildRequestObject(params);
            request.service = "es";
            request.region = REGION;
            request.headers = request.headers || {};
            request.headers["host"] = request.hostname;
            return aws4.sign(request, credentials);
        }
    }
    return {
        Connection: AmazonConnection,
    };
};

const getDomainEndpoint = async (domainName, region) => {
    const client = new OpenSearchClient({
        region: region,
    });
    const command = new DescribeDomainCommand({
        DomainName: domainName,
    });
    const response = await client.send(command);
    return `https://${response.DomainStatus.Endpoint}`;
};

// This function should be run on init and cached
const getClient = async () => {
    const endpoint = await getDomainEndpoint(DOMAIN_NAME, REGION);
    const credentials = await defaultProvider()();
    const awsConnector = createAwsConnector(credentials);
    return new Client({
        ...awsConnector,
        node: endpoint,
    });
};

const getIndex = async (index) => {
    const client = await getClient();

    try {
        const res = await client.search({
            index,
            body: {
                query: {
                    match_all: {},
                },
            },
        });
        console.log(res.body.hits.hits);
    } catch (err) {
        console.log(err);
    }
};

getIndex(INDEX);
