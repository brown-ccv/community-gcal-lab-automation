import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');

/**
 * Load OAuth2 client with saved tokens or prompt for authorization
 */
export async function authorize() {
  // Check if credentials.json exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('\n❌ Error: credentials.json not found!');
    console.error('\nPlease follow these steps:');
    console.error('1. Go to https://console.cloud.google.com/');
    console.error('2. Create a new project (or select existing)');
    console.error('3. Enable Google Calendar API');
    console.error('4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"');
    console.error('5. Choose "Desktop app" as application type');
    console.error('6. Download the JSON file and save it as credentials.json in the project root\n');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have a saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // Get new token
  return getNewToken(oAuth2Client);
}

/**
 * Get and store new OAuth2 token after prompting for user authorization
 */
function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 Authorize this app by visiting this URL:');
  console.log(authUrl);
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the authorization code from the URL: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error retrieving access token:', err);
          reject(err);
          return;
        }
        oAuth2Client.setCredentials(token);
        // Store the token for future runs
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log('✅ Token stored to', TOKEN_PATH);
        resolve(oAuth2Client);
      });
    });
  });
}
