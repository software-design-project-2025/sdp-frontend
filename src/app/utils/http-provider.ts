// src/app/utils/http-provider.ts
import { HttpClient } from '@angular/common/http';
import { Provider } from '@angular/core';

export function provideHttpClientToStandalone(): Provider[] {
  return [HttpClient];
}