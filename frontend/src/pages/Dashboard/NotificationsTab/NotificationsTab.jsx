import React from 'react';
import { Card } from '../../../components/common/Card/Card';
import { InputField } from '../../../components/common/InputField/InputField';
import { Button } from '../../../components/common/Button/Button';
import { ToggleSwitch } from '../../../components/common/ToggleSwitch/ToggleSwitch';
import { LogBox } from '../../../components/common/LogBox/LogBox';
import './NotificationsTab.scss';

export const NotificationsTab = () => {
    const logs = [
        { time: '13:00:00', level: 'success', message: 'Alert for [Category 885] sent to ID 987654321.' },
        { time: '12:45:11', level: 'success', message: 'Alert for [Nintendo Switch] sent to ID 987654321.' },
    ];

    return (
        <div className="notifications-tab">
            <div className="grid-2col">
                <div className="left-column">
                    <Card title="Telegram Webhook Setup">
                        <InputField label="Telegram Bot Token" value="123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ" disabled />
                        <InputField label="Your Telegram Chat ID" defaultValue="987654321" />
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Enable Notifications</span>
                            <ToggleSwitch defaultChecked />
                        </div>
                        
                        <Button fullWidth>Save Changes</Button>
                    </Card>
                </div>
                <div className="right-column">
                    <Card title="Notification History">
                        <LogBox logs={logs} tall />
                    </Card>
                </div>
            </div>
        </div>
    );
};
