export const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
  
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );
  
    return match ? decodeURIComponent(match[2]) : null;
  };

export const deleteCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 UTC; Path=/;`;
};