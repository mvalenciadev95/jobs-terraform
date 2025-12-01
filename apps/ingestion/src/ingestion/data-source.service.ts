import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface DataSource {
  id: string;
  name: string;
  url: string;
  type: 'api' | 'mock';
  rateLimit?: number;
}

@Injectable()
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);
  private readonly httpClient: AxiosInstance;
  private readonly sources: DataSource[];

  constructor() {
    this.httpClient = axios.create({
      timeout: 30000,
    });

    this.sources = [
      {
        id: 'jsonplaceholder',
        name: 'JSONPlaceholder API',
        url: 'https://jsonplaceholder.typicode.com/posts',
        type: 'api',
        rateLimit: 100,
      },
      {
        id: 'reqres',
        name: 'ReqRes API',
        url: 'https://reqres.in/api/users',
        type: 'api',
        rateLimit: 50,
      },
      {
        id: 'mock',
        name: 'Mock Data Source',
        url: '',
        type: 'mock',
      },
    ];
  }

  getSources(): DataSource[] {
    return this.sources;
  }

  getSource(id: string): DataSource | undefined {
    return this.sources.find((s) => s.id === id);
  }

  async fetchData(source: DataSource): Promise<any[]> {
    if (source.type === 'mock') {
      return this.generateMockData();
    }

    try {
      this.logger.log(`Fetching data from ${source.name} (${source.url})`);
      
      const response = await this.httpClient.get(source.url);
      
      if (source.id === 'jsonplaceholder') {
        return Array.isArray(response.data) ? response.data : [response.data];
      }
      
      if (source.id === 'reqres') {
        return response.data.data || [];
      }

      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      this.logger.error(`Failed to fetch data from ${source.id}: ${error.message}`);
      throw error;
    }
  }

  private generateMockData(): any[] {
    return Array.from({ length: 5 }, (_, i) => ({
      id: `mock-${i + 1}`,
      title: `Mock Item ${i + 1}`,
      content: `This is mock data item number ${i + 1}`,
      createdAt: new Date().toISOString(),
    }));
  }
}



