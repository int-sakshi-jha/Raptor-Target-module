import React from "react";
import ColorBadge from "@/components/common/ColorBadge";

export type BoolBadgeProps = {
    value: unknown;
    yes?: string;
    no?: string;
    /** Shown when `value` is `null` or `undefined` */
    emptyDisplay?: React.ReactNode;
};

const BoolBadge: React.FC<BoolBadgeProps> = ({
    value,
    yes = "Yes",
    no = "No",
    emptyDisplay = "-",
}) => {
    if (value === undefined || value === null) {
        return <>{emptyDisplay}</>;
    }
    const on = Boolean(value);
    return (
        <ColorBadge variant={on ? "yes" : "no"}>{on ? yes : no}</ColorBadge>
    );
};

export default BoolBadge;
