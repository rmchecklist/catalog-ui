import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface ProductSuggestion {
  name: string;
  brand: string;
  category: string;
  slug: string;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  suggest(term: string, limit = 8): Observable<ProductSuggestion[]> {
    return this.http.get<ProductSuggestion[]>(`${environment.apiBaseUrl}/products/search`, {
      params: { term, limit },
    });
  }
}
