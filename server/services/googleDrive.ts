import { google } from 'googleapis';
import { db } from '@db';
import { systemSettings } from '@db/schema';
import { eq, or } from 'drizzle-orm';
import fs from 'fs/promises';

interface GoogleDriveConfig {
  clientEmail: string;
  privateKey: string;
  folderId?: string;
}

export async function getGoogleDriveConfig(): Promise<GoogleDriveConfig | null> {
  try {
    const settings = await db.select().from(systemSettings).where(
      or(
        eq(systemSettings.key, 'GOOGLE_DRIVE_CLIENT_EMAIL'),
        eq(systemSettings.key, 'GOOGLE_DRIVE_PRIVATE_KEY'),
        eq(systemSettings.key, 'GOOGLE_DRIVE_FOLDER_ID')
      )
    );

    const clientEmail = settings.find(s => s.key === 'GOOGLE_DRIVE_CLIENT_EMAIL')?.value;
    const privateKey = settings.find(s => s.key === 'GOOGLE_DRIVE_PRIVATE_KEY')?.value;
    const folderId = settings.find(s => s.key === 'GOOGLE_DRIVE_FOLDER_ID')?.value;

    if (!clientEmail || !privateKey) {
      return null;
    }

    return {
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
      folderId,
    };
  } catch (error) {
    console.error('Error fetching Google Drive config:', error);
    return null;
  }
}

export async function uploadToGoogleDrive(filePath: string, mimeType: string, fileName: string) {
  const config = await getGoogleDriveConfig();
  if (!config) {
    throw new Error('Google Drive not configured');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: config.folderId ? [config.folderId] : undefined,
  };

  const fileStream = await fs.readFile(filePath);

  const media = {
    mimeType,
    body: Buffer.from(fileStream),
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}