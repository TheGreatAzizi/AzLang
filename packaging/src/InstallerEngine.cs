using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;

internal static class InstallerEngine
{
    public static void Install(InstallOptions options)
    {
        string root = AzInstall.NormalizeDirectory(options.Directory);
        bool ours = File.Exists(Path.Combine(root, "version.txt"));
        if (Directory.Exists(root))
        {
            string[] existing = Directory.GetFileSystemEntries(root);
            if (existing.Length > 0 && !ours)
            {
                throw new InvalidOperationException(
                    "The selected folder is not empty. Choose an empty folder or the existing AzLang installation.");
            }
        }

        Directory.CreateDirectory(root);

        string[] appFolders = new string[] { "bin", "runtime", "lib", "studio" };
        for (int i = 0; i < appFolders.Length; i++)
        {
            string folder = Path.Combine(root, appFolders[i]);
            if (Directory.Exists(folder))
            {
                try { Directory.Delete(folder, true); }
                catch (Exception error)
                {
                    throw new IOException(
                        "AzLang files are in use. Close AzLang Studio and any terminals using azlang, then try again. " +
                        error.Message, error);
                }
            }
        }

        ExtractPayload(root);

        if (!File.Exists(AzInstall.CliExe(root)) || !File.Exists(AzInstall.StudioExe(root)))
        {
            throw new InvalidOperationException("The installer payload is incomplete.");
        }

        AzInstall.RegisterUninstall(root);
        if (options.AddToPath) AzInstall.AddToUserPath(AzInstall.BinDirectory(root));
        if (options.Associate) AzInstall.RegisterAssociation(root);
        if (options.Shortcuts) AzInstall.CreateShortcuts(root, options.DesktopShortcut);
    }

    private static void ExtractPayload(string root)
    {
        string rootPath = Path.GetFullPath(root).TrimEnd('\\') + "\\";
        using (Stream payload = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
        {
            if (payload == null) throw new InvalidOperationException("The installer payload was not found.");
            using (ZipArchive archive = new ZipArchive(payload, ZipArchiveMode.Read))
            {
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    string name = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                    string target = Path.GetFullPath(Path.Combine(root, name));
                    if (!target.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException("The installer payload contains an invalid path.");
                    }

                    if (entry.FullName.EndsWith("/", StringComparison.Ordinal) ||
                        entry.FullName.EndsWith("\\", StringComparison.Ordinal))
                    {
                        Directory.CreateDirectory(target);
                        continue;
                    }

                    string parent = Path.GetDirectoryName(target);
                    if (!String.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);
                    using (Stream input = entry.Open())
                    using (FileStream output = new FileStream(target, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        input.CopyTo(output);
                    }
                }
            }
        }
    }

    public static void Uninstall(string root)
    {
        root = AzInstall.NormalizeDirectory(root);
        AzInstall.RemoveShortcuts();
        AzInstall.RemoveFromUserPath(AzInstall.BinDirectory(root));
        AzInstall.RemoveAssociation();
        AzInstall.RemoveUninstall();

        // The uninstaller itself lives in the folder, so deletion is scheduled
        // after this process exits.
        AzInstall.ScheduleDirectoryRemoval(root);
    }

    public static void LaunchStudio(string root)
    {
        string studio = AzInstall.StudioExe(root);
        if (!File.Exists(studio)) throw new FileNotFoundException("AzLang Studio was not installed.");
        System.Diagnostics.Process.Start(studio);
    }

    public static void WriteErrorLog(Exception error)
    {
        try
        {
            string path = Path.Combine(Path.GetTempPath(), "AzLang-setup-error.log");
            File.WriteAllText(path,
                DateTime.Now.ToString("u") + Environment.NewLine + error.ToString() + Environment.NewLine,
                Encoding.UTF8);
        }
        catch { }
    }
}
