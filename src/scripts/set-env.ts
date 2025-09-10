import { writeFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const targetPath = './src/environments/environment.ts';
const envConfigFile = `
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  API_KEY_ADMIN: '${process.env['API_KEY_ADMIN']}',
};
`;

writeFileSync(targetPath, envConfigFile);
