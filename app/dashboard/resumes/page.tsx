"use client";

import { useState, useCallback } from "react";
import { ResumeUploadForm } from "../_components/resume-upload-form";
import { CoverLetterForm } from "../_components/cover-letter-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DocumentsPage() {
  const [resumeKey, setResumeKey] = useState(0);
  const handleUploaded = useCallback(() => {
    setResumeKey((k) => k + 1);
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          Upload and manage your resumes and cover letters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Manage your resume PDFs and cover letter versions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resumes">
            <TabsList className="mb-4">
              <TabsTrigger value="resumes">Resumes</TabsTrigger>
              <TabsTrigger value="cover-letters">Cover letters</TabsTrigger>
            </TabsList>
            <TabsContent value="resumes">
              <ResumeUploadForm key={resumeKey} onUploaded={handleUploaded} />
            </TabsContent>
            <TabsContent value="cover-letters">
              <CoverLetterForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
