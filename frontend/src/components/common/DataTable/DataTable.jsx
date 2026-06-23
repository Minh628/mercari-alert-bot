import React from 'react';
import './DataTable.scss';

export const DataTable = ({ columns, data }) => {
    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx}>{col.title}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {columns.map((col, colIndex) => (
                                <td key={colIndex}>
                                    {col.render ? col.render(row[col.dataIndex], row) : row[col.dataIndex]}
                                </td>
                            ))}
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={columns.length} style={{ textAlign: 'center', color: '#555' }}>
                                No data available
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
