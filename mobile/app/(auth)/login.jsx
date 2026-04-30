import { Image, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import Logo from "../../assets/images/logo2.png";
import TYPOGRAHPY from "../../contants/typography";
import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import GoogleIcon from "../../assets/vectors/google.svg";
import Microsoft from "../../assets/vectors/microsoft.svg";
import FloatingInput from '../../components/Input';
import { auth } from "../../config/firebase";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

WebBrowser.maybeCompleteAuthSession();



const login = () => {
    const [request, response, promptAsync] = Google.useAuthRequest({
        expoClientId: "181580130241-uqea35gj4g0u8tl9ndl34anigvkf955a.apps.googleusercontent.com",
        webClientId: "181580130241-uqea35gj4g0u8tl9ndl34anigvkf955a.apps.googleusercontent.com",
        androidClientId: "181580130241-b8p9dmn2bkb2bg1unrjsq0c59c6hi3av.apps.googleusercontent.com",
    });

    useEffect(() => {
        if (response?.type === "success") {
            const { id_token } = response.params;

            const credential = GoogleAuthProvider.credential(id_token);

            signInWithCredential(auth, credential)
            .then(() => {
                alert("Google login successful!");
                router.push("/(tabs)");
            })
            .catch((error) => {
                alert(error.message);
            });
        }
    }, [response]);

    const [active, setActive] = useState("signin");
    const [isFocused, setIsFocused] = useState(false);

    const [signinData, setSigninData] = useState({
        email: "",
        password: "",
    });

    const [signupData, setSignupData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });


    const handleSignup = async () => {
        try {
            if (signupData.password !== signupData.confirmPassword) {
                alert("Passwords do not match");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(
                auth,
                signupData.email,
                signupData.password
            );

            await updateProfile(userCredential.user, {
                displayName: signupData.fullName,
            });

            alert("Account created successfully!");
            router.push("/(tabs)");

        } catch (error) {
            alert(error.message);
        }
    };

    const handleSignin = async () => {
        try {
            await signInWithEmailAndPassword(
                auth,
                signinData.email,
                signinData.password
            );

            alert("Login successful!");
            router.push("/(tabs)"); // or your main app screen

        } catch (error) {
            alert(error.message);
        }
    };

  return (
    <View style={{flex: 1}}>
        <View style={{paddingVertical: 30}}>
            <Image 
                source={Logo}
                style={{
                    width: "100%",
                    height: 90,
                    resizeMode: "contain"
                }}
            />
        </View>

        <View>
            <View style={styles.authBtns}>
                <TouchableOpacity 
                    onPress={()=> 
                        setActive("signin")
                    }
                >
                    <Text style={[styles.btn, active === "signin" && styles.activeText]}>Sign in</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={()=> setActive("signup")}
                >
                    <Text style={[styles.btn, active === "signup" && styles.activeText]}>Sign up</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.lines}></View>
            <View
                style={[
                    styles.active,
                    {
                        position: "absolute",
                        top: 40,
                        left: active === "signin" ? 0 : "26%",
                    },
                ]}
            />

            {active === "signin" ? (
                <View>
                    <View style={styles.inputField}>

                        <FloatingInput
                            placeholder="Email"
                            value={signinData.email}
                            onChangeText={(text) => setSigninData({...signinData, email: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />

                        <FloatingInput
                            placeholder="Password"
                            value={signinData.password}
                            onChangeText={(text) => setSigninData({...signinData, password: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />

                        <View>
                            <TouchableOpacity 
                                onPress={()=> router.push("/(auth)/forgotpassword")}
                            >
                                <Text style={{textAlign: "right", fontFamily: TYPOGRAHPY.semiBold, fontSize: 16}}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{marginTop: 40}}>
                        <Button 
                            text={"Login"}
                            action={handleSignin}
                            bgColor={"#438def"}
                            textColor={"#FFFFFF"}
                            style={{paddingVertical: 17}}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 15}}>
                        <View style={{marginVertical: 20, height: 1, backgroundColor: "#C4C4C4", width: "25%"}}/>
                        <Text style={{textAlign: "center", fontFamily: TYPOGRAHPY.regular, fontSize: 16, color: "#949494"}}>Or continue with</Text>
                        <View style={{marginVertical: 20, height: 1, backgroundColor: "#C4C4C4", width: "25%"}}/>
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20}}>
                        <Button 
                            text={"Google"}
                            bgColor={"#FFFFFF"}
                            textColor={"#656F78"}
                            icon={<GoogleIcon width={16} height={16}/>}
                            style={styles.authBtn}
                            action={() => promptAsync()}
                        />
                        <Button 
                            text={"Microsoft"}
                            bgColor={"#FFFFFF"}
                            textColor={"#656F78"}
                            icon={<Microsoft width={16} height={16} />}
                            style={styles.authBtn}
                            action={() => promptAsync()}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", marginTop: 30}}>
                        <Text style={{fontFamily: TYPOGRAHPY.medium, fontSize: 16, color: "#656F78"}}>
                            Don't have an Account{" "}
                            <Text onPress={() => setActive("signup")} style={{ color: "#5398F1" }}>
                                Sign Up
                            </Text>
                        </Text>
                    </View>
                </View>
            ) : (
                <View>
                    <View style={styles.inputField}>

                        <FloatingInput
                            placeholder="Full Name"
                            value={signupData.name}
                            onChangeText={(text) => setSignupData({...signupData, name: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />

                        <FloatingInput
                            placeholder="Email"
                            value={signupData.email}
                            onChangeText={(text) => setSignupData({...signupData, email: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />

                        <FloatingInput
                            placeholder="Password"
                            value={signupData.password}
                            onChangeText={(text) => setSignupData({...signupData, password: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />

                        <FloatingInput
                            placeholder="Confirm Password"
                            value={signupData.confirmPassword}
                            onChangeText={(text) => setSignupData({...signupData, confirmPassword: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </View>

                    <View style={{marginTop: 40}}>
                        <Button 
                            text={"Join Now"}
                            action={handleSignup}
                            bgColor={"#438def"}
                            textColor={"#FFFFFF"}
                            style={{paddingVertical: 17}}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 15}}>
                        <View style={{marginVertical: 20, height: 1, backgroundColor: "#C4C4C4", width: "25%"}}/>
                        <Text style={{textAlign: "center", fontFamily: TYPOGRAHPY.regular, fontSize: 16, color: "#949494"}}>Or Sign up with</Text>
                        <View style={{marginVertical: 20, height: 1, backgroundColor: "#C4C4C4", width: "25%"}}/>
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20}}>
                        <Button 
                            text={"Google"}
                            bgColor={"#FFFFFF"}
                            textColor={"#656F78"}
                            icon={<GoogleIcon width={16} height={16}/>}
                            style={styles.authBtn}
                            action={() => promptAsync()}
                        />
                        <Button 
                            text={"Microsoft"}
                            bgColor={"#FFFFFF"}
                            textColor={"#656F78"}
                            icon={<Microsoft width={16} height={16} />}
                            style={styles.authBtn}
                            action={() => promptAsync()}
                        />
                    </View>

                </View>
            )}
        </View>
    </View>
  )
}

export default login

const styles = StyleSheet.create({
    authBtns: {
        flexDirection: "row",
        justifyContent: "end",
        alignItems: "center",
        gap: 30,
    },

    btn: {
        fontSize: 18,
        fontFamily: TYPOGRAHPY.regular,
        color: "#949494",
    },

    lines: {
        height: 2,
        width: "100%",
        backgroundColor: "#C4C4C4",
        marginTop: 15
    },

    active: {
        backgroundColor: "#0779B8",
        height: 2,
        width: "20%",
    },

    activeText: {
        fontFamily: TYPOGRAHPY.semiBold,
        color: "#0000009c",
    },

    inputContainer: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 10,
        paddingTop: 18,
        paddingHorizontal: 12,
    },

    label: {
        // position: "absolute",
        left: 12,
        // top: 18,
        color: "#999",
    },

    labelActive: {
        top: -3,
        fontSize: 12,
        backgroundColor: "#fff", // matches your screen
        paddingHorizontal: 4,
    },

    input: {
        height: 50,
        fontSize: 16,
    },

    inputField: {
        marginTop: 30,
    },

    input: {
        borderWidth: 1,
        borderColor: "#cfcdcd",
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 16,
        fontFamily: TYPOGRAHPY.regular,
        marginVertical: 10
    },

    authBtn: {
        paddingHorizontal: 35,
        paddingVertical: 10,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#656F78",
        fontSize: 14,
        fontFamily: TYPOGRAHPY.medium,
    }
})