import React from "react";
import Button from "@/components/common/Button";
import Password from "@/components/common/Password";
import { useChangeMyPasswordMutation } from "@/services/operations/profileAPI";
import { useForm } from "react-hook-form";

type FormValues = {
  currentPassword: string;
  newPassword: string;
};

type Props = {
  onSuccess?: () => void;
  close: () => void;
};

const ChangeMyPasswordForm: React.FC<Props> = ({ onSuccess, close }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    defaultValues: { currentPassword: "", newPassword: "" },
    mode: "onSubmit",
  });

  const mutation = useChangeMyPasswordMutation();

  const onSubmit = (values: FormValues) => {
    mutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          reset();
          onSuccess?.();
          close();
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2" noValidate>
      <Password
        label="Current Password"
        star
        placeholder="Enter your current password"
        autoComplete="current-password"
        errors={errors.currentPassword?.message ? { message: String(errors.currentPassword.message) } : undefined}
        {...register("currentPassword", {
          required: "Current password is required",
        })}
      />
      <Password
        label="New Password"
        star
        placeholder="At least 8 characters"
        autoComplete="new-password"
        errors={errors.newPassword?.message ? { message: String(errors.newPassword.message) } : undefined}
        {...register("newPassword", {
          required: "New password is required",
          minLength: {
            value: 8,
            message: "Password must be at least 8 characters",
          },
          pattern: {
            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
            message:
              "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
          },
        })}
      />
      <div className="flex items-center justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={close} disabled={mutation.isPending || isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={mutation.isPending || isSubmitting}
          disabled={mutation.isPending || isSubmitting}
        >
          Change Password
        </Button>
      </div>
    </form>
  );
};

export default ChangeMyPasswordForm;