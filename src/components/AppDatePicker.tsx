import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface AppDatePickerProps {
    value: string;
    onChange: (dateStr: string) => void;
    placeholderText?: string;
    className?: string;
    required?: boolean;
    isClearable?: boolean;
    style?: React.CSSProperties;
}

const AppDatePicker: React.FC<AppDatePickerProps> = ({
    value,
    onChange,
    placeholderText = 'Select date',
    className = '',
    required = false,
    isClearable = true,
    style,
}) => {
    const selectedDate = value ? new Date(value + 'T00:00:00') : null;

    const handleChange = (date: Date | null) => {
        if (date && !isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            onChange(`${year}-${month}-${day}`);
        } else {
            onChange('');
        }
    };

    return (
        <div className="app-datepicker-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', ...style }}>
            <DatePicker
                selected={selectedDate}
                onChange={handleChange}
                placeholderText={placeholderText}
                className={className}
                required={required}
                isClearable={isClearable}
                dateFormat="yyyy-MM-dd"
                popperClassName="app-datepicker-popper"
                popperPlacement="bottom-start"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                todayButton="Today"
            />
        </div>
    );
};

export default AppDatePicker;
