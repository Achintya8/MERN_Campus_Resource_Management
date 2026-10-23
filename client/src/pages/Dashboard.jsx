import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
    const [resources, setResources] = useState([]);
    const [stats, setStats] = useState({ total: 0, occupied: 0, freeHalls: 0, freeLabs: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/resources');
                setResources(res.data);
                
                const total = res.data.length;
                const occupied = res.data.filter(r => r.occupied).length;
                const freeHalls = res.data.filter(r => r.type === 'HALL' && !r.occupied).length;
                const freeLabs = res.data.filter(r => r.type === 'LAB' && !r.occupied).length;
                
                setStats({ total, occupied, freeHalls, freeLabs });
            } catch (err) {
                console.error("Error fetching dashboard data", err);
            }
        };
        fetchData();
    }, []);

    const barData = {
        labels: ['Halls', 'Classrooms', 'Labs'],
        datasets: [
            {
                label: 'Occupied',
                data: [
                    resources.filter(r => r.type === 'HALL' && r.occupied).length,
                    resources.filter(r => r.type === 'CLASSROOM' && r.occupied).length,
                    resources.filter(r => r.type === 'LAB' && r.occupied).length
                ],
                backgroundColor: '#ef4444',
                borderRadius: 6
            },
            {
                label: 'Free',
                data: [
                    resources.filter(r => r.type === 'HALL' && !r.occupied).length,
                    resources.filter(r => r.type === 'CLASSROOM' && !r.occupied).length,
                    resources.filter(r => r.type === 'LAB' && !r.occupied).length
                ],
                backgroundColor: '#10b981',
                borderRadius: 6
            }
        ]
    };

    const donutData = {
        labels: ['Halls', 'Classrooms', 'Labs'],
        datasets: [{
            data: [
                resources.filter(r => r.type === 'HALL').length,
                resources.filter(r => r.type === 'CLASSROOM').length,
                resources.filter(r => r.type === 'LAB').length
            ],
            backgroundColor: ['#6366f1', '#a855f7', '#f59e0b'],
            hoverOffset: 15,
            borderWidth: 0
        }]
    };

    return (
        <div className="dashboard-page">
            <header>
                <h2>Operational Insights</h2>
                <p style={{ color: 'var(--text-muted)' }}>Real-time overview of campus infrastructure</p>
            </header>

            <div className="stats-grid">
                <div className="card stat-card">
                    <h3>Inventory</h3>
                    <div className="value">{stats.total}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Total Resources</p>
                </div>
                <div className="card stat-card">
                    <h3>Active Usage</h3>
                    <div className="value" style={{ color: 'var(--danger)' }}>{stats.occupied}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Currently Booked</p>
                </div>
                <div className="card stat-card">
                    <h3>Availability</h3>
                    <div className="value" style={{ color: 'var(--success)' }}>{stats.freeLabs + stats.freeHalls}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Ready for Use</p>
                </div>
                <div className="card stat-card">
                    <h3>Maintenance</h3>
                    <div className="value" style={{ color: 'var(--secondary)' }}>0</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Scheduled Service</p>
                </div>
            </div>

            <div className="charts-section">
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Resource Availability by Category</h3>
                    <div className="chart-container">
                        <Bar 
                            data={barData} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { labels: { color: '#94a3b8', font: { family: 'Outfit' } } }
                                },
                                scales: { 
                                    x: { 
                                        stacked: true, 
                                        grid: { display: false },
                                        ticks: { color: '#94a3b8' }
                                    }, 
                                    y: { 
                                        stacked: true,
                                        grid: { color: 'rgba(255,255,255,0.05)' },
                                        ticks: { color: '#94a3b8' }
                                    } 
                                }
                            }} 
                        />
                    </div>
                </div>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Asset Distribution</h3>
                    <div className="chart-container">
                        <Doughnut 
                            data={donutData}
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { 
                                        position: 'bottom',
                                        labels: { color: '#94a3b8', font: { family: 'Outfit' }, padding: 20 } 
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="card resources-list">
                <h3>Live Asset Monitoring</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Resource Identifier</th>
                                <th>Category</th>
                                <th>Capacity</th>
                                <th>Live Status</th>
                                <th>Integrated Features</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resources.map(r => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: '600' }}>{r.name}</td>
                                    <td>
                                        <span className="rc-type">{r.type}</span>
                                    </td>
                                    <td>{r.capacity} Seats</td>
                                    <td>
                                        <span className={`status-badge ${r.occupied ? 'status-occupied' : 'status-empty'}`}>
                                            {r.occupied ? 'In Use' : 'Available'}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {r.features || 'No special features listed'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
