// components/UI/Button.jsx
import { style } from 'motion/react-client';
import React from 'react';

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    ...props
}) => {
    const baseStyles = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-md hover:shadow-lg',
        success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-md hover:shadow-lg',
        danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-md hover:shadow-lg',
        warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500 shadow-md hover:shadow-lg',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500 border border-gray-300',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2.5 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
            disabled={disabled}
            {...props}
        >
            {Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
            {children}
            {Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
        </button>
    );
};

// components/UI/Card.jsx
export const Card = ({ children, className = '', ...props }) => (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`} {...props}>
        {children}
    </div>
);

export const CardHeader = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>{children}</div>
);

export const CardBody = ({ children, className = '' }) => (
    <div className={`px-6 py-4 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-t border-gray-200 ${className}`}>{children}</div>
);

// components/UI/Input.jsx
export const Input = React.forwardRef(
    ({ label, error, icon: Icon, className = '', ...props }, ref) => (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {label}
                    {props.required && <span className="text-red-600 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {Icon && <Icon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />}
                <input
                    ref={ref}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                    {...props}
                />
            </div>
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
    )
);

Input.displayName = 'Input';

// components/UI/Select.jsx
export const Select = ({ label, options, error, className = '', ...props }) => (
    <div className="w-full" style={{ padding: "3px 0px" }}>
        {label && (
            <label className="block text-sm font-semibold text-gray-700 mb-2">
                {label}
                {props.required && <span className="text-red-600 ml-1">*</span>}
            </label>
        )}
        <select
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`} style={{ padding: "3px" }}
            {...props}
        >
            {options.map((option, idx) => (
                <option key={idx} value={option.value || option}>
                    {option.label || option}
                </option>
            ))}
        </select>
        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
);

// components/UI/Modal.jsx
export const Modal = ({ isOpen, onClose, title, children, size = 'md', className = '' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-96 overflow-y-auto ${className}`} style={{
                padding: "10px"
            }}>
                {title && (
                    <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between" style={{ marginBottom: "3px" }}>
                        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                    </div>
                )}
                <div className="p-6" >{children}</div>
            </div>
        </div>
    );
};

// components/UI/Alert.jsx
export const Alert = ({ type = 'info', title, message, icon: Icon, onClose, className = '' }) => {
    const typeStyles = {
        success: 'bg-green-50 border-l-4 border-green-500 text-green-900',
        danger: 'bg-red-50 border-l-4 border-red-500 text-red-900',
        warning: 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900',
        info: 'bg-blue-50 border-l-4 border-blue-500 text-blue-900',
    };

    const iconColor = {
        success: 'text-green-600',
        danger: 'text-red-600',
        warning: 'text-yellow-600',
        info: 'text-blue-600',
    };

    return (
        <div className={`rounded-lg p-4 ${typeStyles[type]} ${className}`}
            style={{ padding: "10px" }}

        >
            <div className="flex items-start gap-3">
                {Icon && <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor[type]}`} />}
                <div className="flex-1">
                    {title && <h3 className="font-semibold mb-1">{title}</h3>}
                    {message && <p className="text-sm opacity-90">{message}</p>}
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-lg opacity-50 hover:opacity-100">
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

// components/UI/StatBox.jsx
export const StatBox = ({ label, value, icon: Icon, color = 'blue', trend, className = '' }) => {
    const colorStyles = {
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        green: 'bg-green-50 border-green-200 text-green-600',
        red: 'bg-red-50 border-red-200 text-red-600',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    };

    return (
        <Card className={`border-2 ${colorStyles[color]} ${className}`} style={{ padding: "10px" }}>
            <CardBody className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs sm:text-sm font-medium opacity-75">{label}</p>
                    {Icon && (
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                </div>
                <p className="text-2xl sm:text-3xl font-bold mb-2">{value}</p>
                {trend && <p className="text-xs font-medium opacity-50">{trend}</p>}
            </CardBody>
        </Card>
    );
};

// components/UI/EmptyState.jsx
export const EmptyState = ({ icon: Icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
        {Icon && <Icon className="w-16 h-16 text-gray-300 mb-4" />}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-600 text-center mb-6 max-w-md">{description}</p>}
        {action && <div>{action}</div>}
    </div>
);

// components/UI/Badge.jsx
export const Badge = ({ children, variant = 'primary', size = 'md', className = '' }) => {
    const baseStyles = 'inline-flex items-center gap-1 font-medium rounded-full';

    const variants = {
        primary: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        danger: 'bg-red-100 text-red-800',
        warning: 'bg-yellow-100 text-yellow-800',
        info: 'bg-cyan-100 text-cyan-800',
        gray: 'bg-gray-100 text-gray-800',
    };

    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
    };

    return <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>{children}</span>;
};

// components/UI/Textarea.jsx
export const Textarea = React.forwardRef(
    ({ label, error, className = '', ...props }, ref) => (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {label}
                    {props.required && <span className="text-red-600 ml-1">*</span>}
                </label>
            )}
            <textarea
                ref={ref}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                {...props}
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
    )
);

Textarea.displayName = 'Textarea';