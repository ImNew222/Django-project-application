export default function Skeleton({ width, height, variant = 'text', className = '' }) {
    const style = {};
    if (width) style.width = width;
    if (height) style.height = height;

    return (
        <div
            className={`skeleton skeleton-${variant} ${className}`}
            style={style}
        />
    );
}

export function SkeletonCard({ lines = 3 }) {
    return (
        <div className="skeleton-card">
            <Skeleton variant="circle" width="40px" height="40px" />
            <div className="skeleton-card-body">
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton
                        key={i}
                        width={i === lines - 1 ? '60%' : '100%'}
                        height="12px"
                    />
                ))}
            </div>
        </div>
    );
}

export function SkeletonStatGrid({ count = 4 }) {
    return (
        <div className="stats-grid">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="stat-card">
                    <Skeleton variant="circle" width="40px" height="40px" />
                    <Skeleton width="60px" height="24px" />
                    <Skeleton width="80px" height="12px" />
                </div>
            ))}
        </div>
    );
}
