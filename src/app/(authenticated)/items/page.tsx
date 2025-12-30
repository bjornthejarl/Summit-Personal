'use client';

import { Suspense, useCallback, useState } from 'react';
import { ItemList, AddItemButton } from '@/components/items/ItemList';

function ItemsPageContent() {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleItemCreated = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Items</h1>
                <AddItemButton onSuccess={handleItemCreated} />
            </div>

            <ItemList key={refreshKey} />
        </div>
    );
}

export default function ItemsPage() {
    return (
        <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading...</div>}>
            <ItemsPageContent />
        </Suspense>
    );
}
