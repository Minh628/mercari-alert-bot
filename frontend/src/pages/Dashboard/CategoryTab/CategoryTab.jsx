import React from 'react';
import { Card } from '../../../components/common/Card/Card';
import { InputField } from '../../../components/common/InputField/InputField';
import { Button } from '../../../components/common/Button/Button';
import { DataTable } from '../../../components/common/DataTable/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge/StatusBadge';
import { LogBox } from '../../../components/common/LogBox/LogBox';
import './CategoryTab.scss';

export const CategoryTab = () => {
    const columns = [
        { title: 'Category ID', dataIndex: 'id', render: (val) => <strong>{val}</strong> },
        { title: 'Price Range', dataIndex: 'price', render: (val) => <StatusBadge status="default" text={val} /> },
        { title: 'Condition', dataIndex: 'condition' },
        { title: 'Status', dataIndex: 'status', render: (val) => <StatusBadge status={val.toLowerCase()} text={val} /> },
    ];

    const data = [
        { id: '885', price: '¥0 - ¥5000', condition: 'New', status: 'Active' },
        { id: '1101', price: 'Any', condition: 'Any', status: 'Active' },
        { id: '234', price: '¥1000 - ¥20000', condition: 'Used', status: 'Paused' },
    ];

    const logs = [
        { time: '12:46:12', level: 'info', message: 'Scanning Category [885]...' },
        { time: '12:46:15', level: 'success', message: 'Found 2 new items! Sending alert...' },
        { time: '12:48:00', level: 'info', message: 'Scanning Category [1101]...' },
    ];

    return (
        <div className="category-tab">
            <div className="grid-2col">
                <div className="left-column">
                    <Card title="Add Category Tracking">
                        <div className="form-inline">
                            <InputField placeholder="Enter Category ID (e.g., 885)" type="number" />
                            <InputField placeholder="Min Price (¥)" type="number" style={{ maxWidth: '130px' }} />
                            <InputField placeholder="Max Price (¥)" type="number" style={{ maxWidth: '130px' }} />
                            <Button variant="outline">Add Target</Button>
                        </div>
                    </Card>

                    <Card title="Tracked Categories">
                        <DataTable columns={columns} data={data} />
                    </Card>
                </div>
                <div className="right-column">
                    <Card title="Live Category Logs">
                        <LogBox logs={logs} tall />
                    </Card>
                </div>
            </div>
        </div>
    );
};
