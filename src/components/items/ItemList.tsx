'use client';

import { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ItemForm } from './ItemForm';

interface ItemListProps {
    className?: string;
}

interface Item {
    id: number;
    name: string;
    description: string | null;
    defaultUnitPrice: string;
    category: string | null;
    sku: string | null;
    isActive: boolean;
}

export function ItemList({ className }: ItemListProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showItemDialog, setShowItemDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: '100',
                activeOnly: 'false',
                ...(searchTerm && { search: searchTerm }),
            });

            const response = await fetch(`/api/items?${params}`);

            if (!response.ok) {
                throw new Error('Failed to fetch items');
            }

            const data = await response.json();
            setItems(data.data || []);
        } catch (error) {
            console.error('Error fetching items:', error);
            toast.error('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [searchTerm]);

    const handleNewItem = () => {
        setEditingItem(null);
        setShowItemDialog(true);
    };

    const handleEditItem = (item: Item) => {
        setEditingItem(item);
        setShowItemDialog(true);
    };

    const handleDeleteItem = async (id: number) => {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const response = await fetch(`/api/items/${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error('Failed to delete item');
                }

                toast.success('Item deleted successfully');
                fetchItems();
            } catch (error) {
                console.error('Error deleting item:', error);
                toast.error('Failed to delete item');
            }
        }
    };

    const handleItemSuccess = () => {
        setShowItemDialog(false);
        setEditingItem(null);
        fetchItems();
    };

    return (
        <div className={className}>
            <div className="flex justify-between items-center mb-6">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        className="pl-8 w-[300px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Button onClick={handleNewItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Item
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Loading items...
                                </TableCell>
                            </TableRow>
                        ) : items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No items found. Create your first item!
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {item.sku || '—'}
                                    </TableCell>
                                    <TableCell>
                                        {item.category ? (
                                            <Badge variant="outline">{item.category}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                        {item.description || '—'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ${parseFloat(item.defaultUnitPrice).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {item.isActive ? (
                                            <Badge variant="default">Active</Badge>
                                        ) : (
                                            <Badge variant="outline">Inactive</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Open menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'Edit Item' : 'Create New Item'}
                        </DialogTitle>
                    </DialogHeader>
                    <ItemForm
                        initialData={editingItem || undefined}
                        onSuccess={handleItemSuccess}
                        onCancel={() => setShowItemDialog(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
