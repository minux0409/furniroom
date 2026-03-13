import { api } from "@/lib/axios";

/** POST /upload?type=image — multipart/form-data */
export async function uploadImage(
  fileUri: string,
  mimeType = "image/jpeg",
): Promise<string> {
  const filename = fileUri.split("/").pop() ?? "photo.jpg";
  const formData = new FormData();
  // React Native FormData는 { uri, name, type } 객체를 허용
  formData.append("file", {
    uri: fileUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const { data } = await api.post<{ url: string; key: string }>(
    "/upload?type=image",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.url;
}
