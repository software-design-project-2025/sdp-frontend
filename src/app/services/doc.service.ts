import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

// Interface for creating a new chat document record
export interface NewChatDoc {
  senderID: string;
  chatID: number;
  doc: string; // This will be the URL of the uploaded document
}

export interface Document {
  id: number;
  userId: string;
  originalFilename: string;
  blobName: string;
  contentType: string;
  uploadedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocApiService {
  constructor(private http: HttpClient) { }

  private url = `${environment.apiBaseUrl}`;

  // Headers for standard JSON requests
  private getJsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  // Headers for file upload requests (omits Content-Type)
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`
    });
  }

  // --- General Document Management ---

  /**
   * 1. Uploads any document file to the backend.
   * The backend will save it to Azure and return metadata.
   * @param file The document file to upload (e.g., a PDF or DOCX).
   * @param userId The ID of the user uploading the file.
   * @returns An observable of the saved document's metadata.
   */
  uploadDocument(file: File, userId: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('userId', userId);

    return this.http.post(`${this.url}/api/documents/upload`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * 2. Gets a secure, temporary download URL for a specific document.
   * @param documentId The unique ID of the document from the database.
   * @returns An observable containing an object with the download URL.
   */
  getDocumentDownloadUrl(documentId: number): Observable<{ downloadUrl: string }> {
    return this.http.get<{ downloadUrl: string }>(
      `${this.url}/api/documents/${documentId}/download-url`, {
        headers: this.getJsonHeaders()
      }
    );
  }


  // --- Chat-Specific Document Management ---

  /**
   * 3. Creates a record in the ChatDoc table to link a document to a chat.
   * This should be called after `uploadDocument` is successful.
   * @param chatDocData The metadata for the chat document.
   * @returns An observable of the created ChatDoc record.
   */
  createChatDoc(chatDocData: NewChatDoc): Observable<any> {
    return this.http.post(`${this.url}/api/chatdocs`, chatDocData, {
      headers: this.getJsonHeaders()
    });
  }

  /**
   * Retrieves all document records associated with a specific chat.
   * @param chatId The ID of the chat.
   * @returns An observable containing a list of ChatDoc records.
   */
  getDocsByChatId(chatId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/api/chatdocs/chat/${chatId}`, {
      headers: this.getJsonHeaders()
    });
  }
}
