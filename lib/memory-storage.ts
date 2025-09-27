// In-memory storage fallback when Firebase is not configured
// This data will be lost when the server restarts

interface PendingResource {
  id: string;
  name: string;
  type: "shelter" | "food_bank" | "clinic";
  address: string;
  lat: number;
  lng: number;
  notes: string;
  source: string;
  submittedBy: string;
  submittedAt: string;
  aiReview: {
    status: string;
    notes: string;
  };
}

interface ApprovedResource extends PendingResource {
  approvedAt: string;
}

class MemoryStorage {
  private pendingResources: PendingResource[] = [];
  private approvedResources: ApprovedResource[] = [];

  addPendingResource(data: Omit<PendingResource, 'id'>): string {
    const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const resource: PendingResource = { id, ...data };
    this.pendingResources.push(resource);
    console.log('Added to memory storage:', id);
    return id;
  }

  getAllPendingResources(): PendingResource[] {
    return [...this.pendingResources];
  }

  approveResource(id: string): boolean {
    const index = this.pendingResources.findIndex(r => r.id === id);
    if (index === -1) return false;

    const resource = this.pendingResources[index];
    this.pendingResources.splice(index, 1);
    
    const approvedResource: ApprovedResource = {
      ...resource,
      approvedAt: new Date().toISOString()
    };
    
    this.approvedResources.push(approvedResource);
    console.log('Approved and moved to approved resources:', id);
    return true;
  }

  getStats() {
    return {
      pending: this.pendingResources.length,
      approved: this.approvedResources.length,
      total: this.pendingResources.length + this.approvedResources.length
    };
  }
}

// Singleton instance
export const memoryStorage = new MemoryStorage();
