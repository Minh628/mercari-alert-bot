import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/common/Card/Card';
import { InputField } from '../../../components/common/InputField/InputField';
import { Button } from '../../../components/common/Button/Button';
import { DataTable } from '../../../components/common/DataTable/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge/StatusBadge';
import { followService } from '../../../services/follow.service';
import { toast } from 'sonner';
import './FollowsTab.scss';

export const FollowsTab = () => {
    const [follows, setFollows] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [searchType, setSearchType] = useState('keyword'); // 'keyword' | 'category'
    const [keyword, setKeyword] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');

    const fetchFollows = async () => {
        try {
            setLoading(true);
            const data = await followService.getAll();
            setFollows(data || []);
        } catch (error) {
            console.error('Fetch follows error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFollows();
    }, []);

    const handleAdd = async () => {
        // Validation: Logic độc quyền (XOR) và bắt lỗi
        if (searchType === 'keyword' && !keyword) {
            toast.error("Vui lòng nhập Keyword");
            return;
        }
        if (searchType === 'category' && !categoryId) {
            toast.error("Vui lòng nhập Category ID");
            return;
        }

        const pMin = priceMin ? Number(priceMin) : null;
        const pMax = priceMax ? Number(priceMax) : null;

        if (pMin !== null && pMax !== null && pMin > pMax) {
            toast.error("Giá tối thiểu không được lớn hơn Giá tối đa");
            return;
        }
        
        try {
            await followService.create({ 
                keyword: searchType === 'keyword' ? keyword : null, 
                category_id: searchType === 'category' ? categoryId : null,
                price_min: pMin,
                price_max: pMax
            });
            toast.success("Thêm cấu hình thành công!");
            setKeyword('');
            setCategoryId('');
            setPriceMin('');
            setPriceMax('');
            fetchFollows();
        } catch (error) {
            // Error handled by interceptor
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa cấu hình này?")) return;
        try {
            await followService.delete(id);
            toast.success("Đã xóa cấu hình!");
            fetchFollows();
        } catch (error) {
            // Error handled by interceptor
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await followService.update(id, { isActive: !currentStatus });
            toast.success(currentStatus ? "Đã tắt bot cho cấu hình này" : "Đã bật bot!");
            fetchFollows();
        } catch (error) {
            // Error handled
        }
    };

    const columns = [
        { title: 'ID', dataIndex: 'id' },
        { 
            title: 'Mục tiêu', 
            dataIndex: 'target', 
            render: (_, row) => (
                <div>
                    {row.keyword && <div><strong>Keyword:</strong> {row.keyword}</div>}
                    {row.categoryId && <div><strong>Category:</strong> {row.categoryId}</div>}
                </div>
            ) 
        },
        { 
            title: 'Khoảng giá', 
            dataIndex: 'price', 
            render: (_, row) => {
                if (row.priceMin == null && row.priceMax == null) return "Mọi mức giá";
                const min = row.priceMin ? `${row.priceMin}¥` : '0¥';
                const max = row.priceMax ? `${row.priceMax}¥` : 'Vô hạn';
                return `${min} - ${max}`;
            } 
        },
        { 
            title: 'Trạng thái', 
            dataIndex: 'isActive', 
            render: (val) => <StatusBadge status={val ? 'success' : 'error'} text={val ? 'Active' : 'Stopped'} /> 
        },
        {
            title: 'Hành động',
            dataIndex: 'actions',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                        variant="outline" 
                        onClick={() => handleToggleActive(row.id, row.isActive)}
                    >
                        {row.isActive ? 'Tạm dừng' : 'Chạy lại'}
                    </Button>
                    <Button 
                        variant="primary" 
                        style={{ background: '#ef4444', borderColor: '#ef4444' }}
                        onClick={() => handleDelete(row.id)}
                    >
                        Xóa
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="follows-tab">
            {/* Form thêm cấu hình - full width, không còn sidebar LogBox */}
            <Card title="Thêm Cấu Hình Theo Dõi Mới" className="add-config-card">
                {/* Khu vực chọn loại tìm kiếm (Toggle XOR) */}
                <div className="search-type-toggle">
                    <button 
                        className={`toggle-btn ${searchType === 'keyword' ? 'active' : ''}`}
                        onClick={() => setSearchType('keyword')}
                    >
                        Theo Keyword
                    </button>
                    <button 
                        className={`toggle-btn ${searchType === 'category' ? 'active' : ''}`}
                        onClick={() => setSearchType('category')}
                    >
                        Theo Category
                    </button>
                </div>

                {/* Khu vực nhập liệu (Horizontal layout khi full width) */}
                <div className="form-inline">
                    <div className="form-main-input">
                        {searchType === 'keyword' ? (
                            <InputField 
                                placeholder="Nhập Keyword (Ví dụ: Nintendo)" 
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        ) : (
                            <InputField 
                                placeholder="Nhập Category ID (Ví dụ: 1101)" 
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                            />
                        )}
                    </div>
                    <div className="form-price-group">
                        <InputField 
                            type="number"
                            placeholder="Giá từ (¥)" 
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                        />
                        <span className="separator">—</span>
                        <InputField 
                            type="number"
                            placeholder="Giá đến (¥)" 
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                        />
                    </div>
                    <Button variant="primary" onClick={handleAdd} className="add-btn">
                        + Thêm Target
                    </Button>
                </div>
            </Card>

            {/* Bảng danh sách - full width */}
            <Card title={`Danh sách Cấu hình (${follows.length})`}>
                <DataTable columns={columns} data={follows} />
            </Card>
        </div>
    );
};
