using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using Microsoft.Win32;

[assembly: AssemblyTitle("AzLang Studio")]
[assembly: AssemblyDescription("AzLang Studio desktop launcher")]
[assembly: AssemblyProduct("AzLang")]
[assembly: AssemblyCompany("TheGreatAzizi")]
[assembly: AssemblyCopyright("MIT License")]
[assembly: AssemblyVersion("2.0.0.0")]
[assembly: AssemblyFileVersion("2.0.0.0")]

internal static class AzLangStudioLauncher
{
    private static bool HasArgument(string[] args, string name)
    {
        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    private static string Quote(string value)
    {
        if (value == null) return "\"\"";
        if (value.Length > 0 && value.IndexOfAny(new char[] { ' ', '\t', '\n', '\v', '"' }) < 0) return value;
        return "\"" + value.Replace("\"", "\\\"") + "\"";
    }

    private static string RegistryAppPath(RegistryKey root, string subkey)
    {
        try
        {
            using (RegistryKey key = root.OpenSubKey(subkey))
            {
                if (key == null) return null;
                string value = key.GetValue(null) as string;
                if (!String.IsNullOrEmpty(value) && File.Exists(value)) return value;
            }
        }
        catch
        {
            // A missing or unreadable key is not an error here.
        }
        return null;
    }

    private static string FindBrowser(string executable)
    {
        string[] keys = new string[]
        {
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\" + executable,
            @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\" + executable
        };

        for (int i = 0; i < keys.Length; i++)
        {
            string found = RegistryAppPath(Registry.CurrentUser, keys[i]);
            if (found != null) return found;
            found = RegistryAppPath(Registry.LocalMachine, keys[i]);
            if (found != null) return found;
        }

        string[] roots = new string[]
        {
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)
        };

        string[] relative = executable == "msedge.exe"
            ? new string[] { @"Microsoft\Edge\Application\msedge.exe", @"Microsoft\Edge SxS\Application\msedge.exe" }
            : new string[] { @"Google\Chrome\Application\chrome.exe", @"Google\Chrome Beta\Application\chrome.exe" };

        for (int r = 0; r < roots.Length; r++)
        {
            if (String.IsNullOrEmpty(roots[r])) continue;
            for (int p = 0; p < relative.Length; p++)
            {
                try
                {
                    string candidate = Path.Combine(roots[r], relative[p]);
                    if (File.Exists(candidate)) return candidate;
                }
                catch
                {
                    // Ignore malformed environment paths.
                }
            }
        }
        return null;
    }

    private static int Main(string[] args)
    {
        string installRoot;
        try
        {
            installRoot = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".."));
        }
        catch
        {
            return 1;
        }

        bool docs = HasArgument(args, "--docs");
        bool print = HasArgument(args, "--print-command");
        string page = Path.Combine(installRoot, Path.Combine("studio", docs ? "docs.html" : "ide.html"));

        if (!File.Exists(page))
        {
            Console.Error.WriteLine("AzLang Studio: page not found: " + page);
            if (Environment.UserInteractive && !print)
            {
                System.Windows.Forms.MessageBox.Show(
                    "The AzLang Studio files are missing. Please reinstall AzLang.",
                    "AzLang Studio",
                    System.Windows.Forms.MessageBoxButtons.OK,
                    System.Windows.Forms.MessageBoxIcon.Error);
            }
            return 1;
        }

        string browser = FindBrowser("msedge.exe");
        if (browser == null) browser = FindBrowser("chrome.exe");

        string pageUri;
        try
        {
            pageUri = new Uri(page).AbsoluteUri;
        }
        catch
        {
            pageUri = page;
        }

        if (browser == null)
        {
            if (print)
            {
                Console.WriteLine(page);
                return 0;
            }
            try
            {
                Process.Start(new ProcessStartInfo(page) { UseShellExecute = true });
                return 0;
            }
            catch (Exception error)
            {
                Console.Error.WriteLine("AzLang Studio: could not open a browser: " + error.Message);
                return 1;
            }
        }

        string profile = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            Path.Combine("AzLang", "StudioProfile"));
        try
        {
            Directory.CreateDirectory(profile);
        }
        catch
        {
            profile = Path.GetTempPath();
        }

        string arguments =
            "--app=" + Quote(pageUri) +
            " --user-data-dir=" + Quote(profile) +
            " --no-first-run --no-default-browser-check" +
            " --window-size=1360,860";

        if (print)
        {
            Console.WriteLine(Quote(browser) + " " + arguments);
            return 0;
        }

        try
        {
            Process.Start(new ProcessStartInfo(browser, arguments) { UseShellExecute = false });
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("AzLang Studio: could not start " + Path.GetFileName(browser) + ": " + error.Message);
            try
            {
                Process.Start(new ProcessStartInfo(page) { UseShellExecute = true });
                return 0;
            }
            catch
            {
                return 1;
            }
        }
    }
}
