import Dexie, { type Table } from 'dexie';

export interface EmbeddingDict {
    [string: string]: number[]
}

export interface Embedding {
    chunk: string,
    embedding: number[],
    source: string
}

export interface SourceMetadata {
    source: string,
    lastAccess: Date
}


class EmbeddingDB extends Dexie {
    embeddings: Table<Embedding, string>;
    sources: Table<SourceMetadata, string>;

    constructor() {
        super("ShadeRunner");
        this.version(1).stores({
            embeddings: 'chunk',
            sources: 'source, lastAccess'
        });
        this.embeddings = this.table("embeddings");
        this.sources = this.table("sources");
    }


    // save or update bulk embeddings
    async saveEmbeddings(embeddingsDict: EmbeddingDict, source: string) {
        try {
            const embeddingsArray = Object.entries(embeddingsDict).map(([sentence, embedding]) => ({
                chunk: sentence,
                embedding: embedding,
                source: source
            }));

            await this.embeddings.bulkPut(embeddingsArray);
        } catch (error) {
            console.error("Error writing bulk embeddings:", error);
            throw error;
        }
    }

    // Method to retrieve embeddings for a set of sentences on a given URL
    async getEmbeddingsForStrings(chunks: string[]): Promise<EmbeddingDict> {
        try {
            // Check if the strings array is not empty
            if (chunks.length === 0) {
                return {};
            }

            // Convert the strings array to a Set for O(1) lookup time
            const stringsSet = new Set(chunks);

            // Fetch embeddings for the given strings
            const allEmbeddings = await this.embeddings.where('chunk').anyOf([...stringsSet]).toArray();

            // Reduce the fetched embeddings into a dictionary
            const embeddingsDict: EmbeddingDict = allEmbeddings.reduce((acc, { chunk, embedding }) => {
                acc[chunk] = embedding;
                return acc;
            }, {});

            return embeddingsDict;
        } catch (error) {
            console.error('Error retrieving embeddings:', error);
            throw error;
        }
    }


    // Delete old embeddings based on the "older than X days" criteria
    async deleteOldEmbeddings(days: number = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
    
        try {
            // Find old sources and their corresponding embeddings
            const oldSources = await this.sources.where('lastAccess').below(cutoffDate).toArray();
            const oldSourceKeys = oldSources.map(s => s.source);
    
            await this.transaction('rw', this.embeddings, this.sources, async () => {
                // Delete old sources
                await this.sources.bulkDelete(oldSourceKeys);
    
                // Find embeddings associated with old sources
                const oldEmbeddings = await Promise.all(oldSourceKeys.map(source => this.embeddings.where('source').equals(source).toArray()));
    
                // Flatten the array of arrays into a single array of embeddings
                const embeddingsToDelete = oldEmbeddings.flat();
    
                // Delete the embeddings
                await Promise.all(embeddingsToDelete.map(embedding => this.embeddings.delete(embedding.chunk)));
            });
        } catch (error) {
            console.error("Error deleting old embeddings", error);
        }
    }


    // Update last access date for a source
    async updateLastAccessDate(source: string) {
        try {
            await this.sources.put({ source, lastAccess: new Date() });
        } catch (e) {
            console.error("Error updating last access date", e);
        }
    }

    // Check if an embedding exists
    async sourceExists(source: string) {
        const count = await this.sources.where('source').equals(source).count();
        return count > 0;
    }
}

export const db = new EmbeddingDB();