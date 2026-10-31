using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;

[assembly: AssemblyTitle("AzLang")]
[assembly: AssemblyDescription("AzLang command-line launcher")]
[assembly: AssemblyProduct("AzLang")]
[assembly: AssemblyCompany("TheGreatAzizi")]
[assembly: AssemblyCopyright("MIT License")]
[assembly: AssemblyVersion("2.1.0.0")]
[assembly: AssemblyFileVersion("2.1.0.0")]

internal static class AzLangLauncher
{
    private static string Quote(string value)
    {
        if (value == null) return "\"\"";
        if (value.Length > 0 && value.IndexOfAny(new char[] { ' ', '\t', '\n', '\v', '"' }) < 0) return value;

        StringBuilder result = new StringBuilder();
        result.Append('"');
        int backslashes = 0;
        for (int i = 0; i < value.Length; i++)
        {
            char c = value[i];
            if (c == '\\')
            {
                backslashes++;
            }
            else if (c == '"')
            {
                result.Append('\\', backslashes * 2 + 1);
                result.Append('"');
                backslashes = 0;
            }
            else
            {
                if (backslashes > 0)
                {
                    result.Append('\\', backslashes);
                    backslashes = 0;
                }
                result.Append(c);
            }
        }
        result.Append('\\', backslashes * 2);
        result.Append('"');
        return result.ToString();
    }

    private static string FindOnPath(string fileName)
    {
        string path = Environment.GetEnvironmentVariable("PATH");
        if (String.IsNullOrEmpty(path)) return null;
        string[] directories = path.Split(new char[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < directories.Length; i++)
        {
            try
            {
                string candidate = Path.Combine(directories[i].Trim().Trim('"'), fileName);
                if (File.Exists(candidate)) return candidate;
            }
            catch
            {
                // Ignore malformed PATH entries.
            }
        }
        return null;
    }

    private static int Fail(string message)
    {
        Console.Error.WriteLine("azlang: " + message);
        Console.Error.WriteLine();
        Console.Error.WriteLine("The installation looks incomplete. Reinstall AzLang from");
        Console.Error.WriteLine("https://github.com/TheGreatAzizi/AzLang/releases/latest");
        if (Environment.UserInteractive)
        {
            Console.Error.WriteLine();
            Console.Error.Write("Press Enter to close...");
            try { Console.ReadLine(); } catch { }
        }
        return 1;
    }

    private static int Main(string[] args)
    {
        try
        {
            Console.OutputEncoding = new UTF8Encoding(false);
        }
        catch
        {
            // Redirected output may not support a code page change.
        }

        string binDir = AppDomain.CurrentDomain.BaseDirectory;
        string root;
        try
        {
            root = Path.GetFullPath(Path.Combine(binDir, ".."));
        }
        catch
        {
            return Fail("cannot locate the AzLang installation folder.");
        }

        string script = Path.Combine(root, Path.Combine("lib", "azlang.js"));
        string node = Path.Combine(root, Path.Combine("runtime", "node.exe"));

        if (!File.Exists(script))
        {
            return Fail("the AzLang runtime was not found at " + script);
        }

        if (!File.Exists(node))
        {
            node = FindOnPath("node.exe");
            if (node == null)
            {
                return Fail("the bundled Node.js runtime was not found. Install Node.js 18+ or reinstall AzLang.");
            }
        }

        StringBuilder commandLine = new StringBuilder();
        commandLine.Append(Quote(script));
        for (int i = 0; i < args.Length; i++)
        {
            commandLine.Append(' ');
            commandLine.Append(Quote(args[i]));
        }

        ProcessStartInfo start = new ProcessStartInfo();
        start.FileName = node;
        start.Arguments = commandLine.ToString();
        start.UseShellExecute = false;
        start.WorkingDirectory = Environment.CurrentDirectory;

        try
        {
            start.EnvironmentVariables["AZLANG_HOME"] = root;
        }
        catch
        {
            // Older environments may expose a read-only environment block.
        }

        try
        {
            using (Process process = Process.Start(start))
            {
                if (process == null) return Fail("could not start Node.js.");
                process.WaitForExit();
                return process.ExitCode;
            }
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("azlang: could not start the runtime: " + error.Message);
            return 1;
        }
    }
}
