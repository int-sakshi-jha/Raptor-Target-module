import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useUpdateMyProfileMutation, type UserDetailProfile } from "@/services/operations/profileAPI";
import toast from "react-hot-toast";
import { USERNAME_PATTERN, applyBackendErrors } from "@/utils/formValidators";

type UserMeFormValues = {
  first_name: string;
  last_name: string;
  username: string;
  phone?: string | null;
};

type UserMeFormProps = {
  initialValues?: Partial<UserDetailProfile>;
  onSuccess?: () => void;
  close: () => void;
};

const UserMeForm: React.FC<UserMeFormProps> = ({
  initialValues,
  onSuccess,
  close,
}) => {
  const updateMyProfileMutation = useUpdateMyProfileMutation();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    getValues,
    formState: { errors, isDirty },
  } = useForm<UserMeFormValues>({
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!initialValues) return;

    reset({
      first_name: initialValues.first_name ?? "",
      last_name: initialValues.last_name ?? "",
      username: initialValues.username ?? "",
      phone: initialValues.phone ?? "",
    });
  }, [initialValues, reset]);

  const onSubmit = (data: UserMeFormValues) => {
    const normalize = (value: unknown) => {
      if (value === null || value === undefined) return null;
      const text = String(value).trim();
      return text === "" ? null : text;
    };

    const nextFirstName = normalize(data.first_name) ?? "";
    const nextLastName = normalize(data.last_name) ?? "";
    const nextUsername = normalize(data.username);
    const nextPhone = normalize(data.phone);

    const currentFirstName = normalize(initialValues?.first_name) ?? "";
    const currentLastName = normalize(initialValues?.last_name) ?? "";
    const currentUsername = normalize(initialValues?.username);
    const currentPhone = normalize(initialValues?.phone);

    const payload: Partial<UserDetailProfile> = {};
    if (nextFirstName !== currentFirstName) payload.first_name = nextFirstName;
    if (nextLastName !== currentLastName) payload.last_name = nextLastName;
    if (nextUsername !== currentUsername) payload.username = nextUsername;
    if (nextPhone !== currentPhone) payload.phone = nextPhone;

    if (Object.keys(payload).length === 0) {
      toast("No profile changes to save.");
      close();
      return;
    }

    updateMyProfileMutation.mutate(
      payload,
      {
        onSuccess: () => {
          onSuccess?.();
          close();
        },
        onError: (error) => applyBackendErrors(error, setError, getValues),
      },
    );
  };

  return (
    <form
      onSubmit={(e) => {
        clearErrors();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex h-full flex-col gap-2 py-2"
      noValidate
    >
      <section className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            label="First Name"
            star
            {...register("first_name", {
              required: "First name is required.",
              minLength: {
                value: 2,
                message: "First name must contain at least 2 characters.",
              },
              maxLength: {
                value: 100,
                message: "First name must not exceed 100 characters.",
              },
            })}
            errors={errors.first_name}
            placeholder="e.g., John"
          />
          <Input
            label="Last Name"
            star
            {...register("last_name", {
              required: "Last name is required.",
              minLength: {
                value: 2,
                message: "Last name must contain at least 2 characters.",
              },
              maxLength: {
                value: 100,
                message: "Last name must not exceed 100 characters.",
              },
            })}
            errors={errors.last_name}
            placeholder="e.g., Doe"
          />
          <Input
            label="Username"
            star
            {...register("username", {
              required: "Username is required.",
              pattern: {
                value: USERNAME_PATTERN,
                message:
                  "Username must start with a letter and contain 3-32 letters, numbers, or underscores.",
              },
            })}
            errors={errors.username}
            placeholder="e.g., john_doe"
            className="md:col-span-2"
          />
          {/* <Input
            label="Phone"
            {...register("phone", {
              validate: (value) =>
                !value || PHONE_PATTERN.test(value) || "Phone number must be exactly 10 digits.",
            })}
            errors={errors.phone}
            placeholder="e.g., 9876543210"
            className="md:col-span-2"
            inputMode="numeric"
            maxLength={10}
            onInput={sanitizePhoneInput}
          /> */}
        </div>
      </section>

      <div className="flex justify-between z-20 mt-auto border-t border-neutral-200 bg-white/95 pt-2 pb-1 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
        <Button type="button" variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={updateMyProfileMutation.isPending}
          disabled={updateMyProfileMutation.isPending || !isDirty}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default UserMeForm;