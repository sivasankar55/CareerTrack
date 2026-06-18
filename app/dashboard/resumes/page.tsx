"use client";

import { ResumeUploadForm } from "../_components/resume-upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResumesPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resume versions</h1>
        <p className="text-muted-foreground">
          Upload and manage your resume PDFs to attach to applications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload a resume</CardTitle>
          <CardDescription>
            Upload a PDF and give it a label so you can identify which version
            you sent to each application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUploadForm onUploaded={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
}
