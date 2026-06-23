import React from 'react';
import { Card } from '../../../components/common/Card/Card';
import { InputField } from '../../../components/common/InputField/InputField';
import { Button } from '../../../components/common/Button/Button';
import './SettingsTab.scss';

export const SettingsTab = () => {
    return (
        <div className="settings-tab">
            <div className="grid-2col">
                <div className="left-column">
                    <Card title="Crawler Configuration">
                        <InputField label="Crawl Interval (seconds)" type="number" defaultValue="10" />
                        <InputField label="Proxy Address (IP:Port:User:Pass)" placeholder="Optional: Use proxy for safe crawling" />
                        
                        <div style={{ marginTop: '10px' }}>
                            <Button fullWidth>Update Settings</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
