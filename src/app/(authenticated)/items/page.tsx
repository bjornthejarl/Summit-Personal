import { ItemList } from '@/components/items/ItemList';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Items | vAlpha',
    description: 'Manage your items and products catalog',
};

export default function ItemsPage() {
    return (
        <div className="container mx-auto py-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Items</h1>
                    <p className="text-muted-foreground">Manage your products and services catalog</p>
                </div>
            </div>

            <ItemList className="mt-6" />
        </div>
    );
}
