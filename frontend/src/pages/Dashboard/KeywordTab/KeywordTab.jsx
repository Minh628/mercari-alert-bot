import React from 'react';
import { Card } from '../../../components/common/Card/Card';
import { InputField } from '../../../components/common/InputField/InputField';
import { Button } from '../../../components/common/Button/Button';
import { DataTable } from '../../../components/common/DataTable/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge/StatusBadge';
import { LogBox } from '../../../components/common/LogBox/LogBox';
import './KeywordTab.scss';

export const KeywordTab = () => {
    const columns = [
        { title: 'Keyword', dataIndex: 'keyword', render: (val) => <strong>{val}</strong> },
        { title: 'Category Filter', dataIndex: 'category', render: (val) => <StatusBadge status="default" text={val} /> },
        { title: 'Status', dataIndex: 'status', render: (val) => <StatusBadge status={val.toLowerCase()} text={val} /> },
    ];

    const data = [
        { keyword: 'Nintendo Switch OLED', category: 'Gaming', status: 'Active' },
        { keyword: 'Adidas Yeezy 350', category: 'Fashion', status: 'Active' },
    ];

    const logs = [
        { time: '12:50:11', level: 'info', message: "Searching keyword 'Nintendo Switch OLED'..." },
        { time: '12:50:14', level: 'success', message: 'No new items.' },
    ];

    return (
        <div className="keyword-tab">
            <div className="grid-2col">
                <div className="left-column">
                    <Card title="Add Keyword Tracking">
                        <div className="form-inline">
                            <InputField placeholder="Enter Product Keyword" />
                            <InputField 
                                type="select" 
                                options={[
                                    { value: 'all', label: 'All Categories' },
                                    { value: '1101', label: 'Gaming' },
                                    { value: '885', label: 'Electronics' }
                                ]} 
                                style={{ maxWidth: '180px' }} 
                            />
                            <Button variant="outline">Add Target</Button>
                        </div>
                    </Card>

                    <Card title="Tracked Keywords">
                        <DataTable columns={columns} data={data} />
                    </Card>
                </div>
                <div className="right-column">
                    <Card title="Live Keyword Logs">
                        <LogBox logs={logs} tall />
                    </Card>
                </div>
            </div>
        </div>
    );
};
