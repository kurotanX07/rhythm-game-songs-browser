export interface Game {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    songCount: number;
    lastUpdated: Date;
  }